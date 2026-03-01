import { useEffect, useMemo, useState } from 'react';
import { Loader, Plus, RefreshCcw, Users, X } from 'react-feather';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { useParams } from 'react-router';

import ContentsTable from '../components/content/ContentsTable';
import Layout from '../components/layout';
import FilterDropdown, {
  FilterDropdownSection,
} from '../components/shared/FilterDropdown';
import Modal from '../components/shared/Modal';
import PageBrandFixed from '../components/shared/PageBrandFixed';
import useAuth from '../hooks/useAuth';
import useDebouncedValue from '../hooks/useDebouncedValue';
import CreateContentRequest from '../models/content/CreateContentRequest';
import contentService from '../services/ContentService';
import courseService from '../services/CourseService';

export default function Course() {
  const { id } = useParams<{ id: string }>();
  const { authenticatedUser } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<'dateCreated' | 'name' | 'description'>(
    'dateCreated',
  );
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [addContentShow, setAddContentShow] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const debouncedName = useDebouncedValue(name);
  const debouncedDescription = useDebouncedValue(description);

  const queryParams = useMemo(
    () => ({
      name: debouncedName || undefined,
      description: debouncedDescription || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [debouncedName, debouncedDescription, page, limit, sortBy, sortOrder],
  );

  const userQuery = useQuery(
    ['course', id],
    async () => courseService.findOne(id),
    {
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<CreateContentRequest>();

  const {
    data: contentsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery(
    [`contents-${id}`, queryParams],
    async () => contentService.findAll(id, queryParams),
    {
      keepPreviousData: true,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  );

  const data = contentsResponse?.data ?? [];
  const total = contentsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filterSections: FilterDropdownSection[] = useMemo(
    () => [
      {
        id: 'pagination',
        label: 'Pagination',
        selectedValue: String(limit),
        options: [
          { label: '5 per page', value: '5' },
          { label: '10 per page', value: '10' },
          { label: '20 per page', value: '20' },
        ],
        onSelect: (value) => {
          setLimit(Number(value));
          setPage(1);
        },
      },
      {
        id: 'sort',
        label: 'Sort',
        selectedValue: sortBy,
        options: [
          { label: 'Creation date', value: 'dateCreated' },
          { label: 'Name', value: 'name' },
          { label: 'Description', value: 'description' },
        ],
        onSelect: (value) => {
          setSortBy(value as 'dateCreated' | 'name' | 'description');
          setPage(1);
        },
      },
      {
        id: 'order',
        label: 'Order',
        selectedValue: sortOrder,
        options: [
          { label: 'Descending', value: 'DESC' },
          { label: 'Ascending', value: 'ASC' },
        ],
        onSelect: (value) => {
          setSortOrder(value as 'ASC' | 'DESC');
          setPage(1);
        },
      },
    ],
    [limit, sortBy, sortOrder],
  );

  const saveCourse = async (createContentRequest: CreateContentRequest) => {
    try {
      await contentService.save(id, createContentRequest);
      setAddContentShow(false);
      reset();
      setError(undefined);
      await refetch();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? 'Error creating content');
    }
  };

  return (
    <Layout>
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="font-semibold text-3xl">
          {!userQuery.isLoading ? `${userQuery.data.name} Contents` : ''}
        </h1>
        <PageBrandFixed />
      </div>
      <hr />

      <div className="my-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          {authenticatedUser.role !== 'user' ? (
            <button
              className="btn flex gap-2 w-full sm:w-auto justify-center"
              onClick={() => setAddContentShow(true)}
            >
              <Plus /> Add Content
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="md:flex-1 flex justify-center">
          {!userQuery.isLoading ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              <Users size={16} />
              {userQuery.data?.enrolledUsersCount ?? 0} enrolled
            </span>
          ) : null}
        </div>

        <div className="md:flex-1 flex items-center justify-end gap-2">
          <FilterDropdown sections={filterSections} />
          <button
            type="button"
            aria-label="Refresh contents"
            onClick={() => refetch()}
            className="h-10 w-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring transition-colors flex items-center justify-center disabled:opacity-50"
            disabled={isFetching}
          >
            <RefreshCcw
              size={16}
              className={isFetching ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>

      <div className="table-filter">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col md:flex-row gap-2 flex-1">
            <input
              type="text"
              className="input h-12 w-full md:w-[210px]"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              className="input h-12 w-full md:w-[210px]"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 lg:ml-auto">
            <button
              type="button"
              className="btn px-4 py-2.5"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn px-4 py-2.5"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ContentsTable data={data} isLoading={isLoading} courseId={id} />

      <p className="mt-3 text-center text-sm text-gray-600">
        Page {page} of {totalPages} | Total: {total}
      </p>

      <Modal show={addContentShow}>
        <div className="flex">
          <h1 className="font-semibold mb-3">Add Content</h1>
          <button
            className="ml-auto focus:outline-none"
            onClick={() => {
              reset();
              setAddContentShow(false);
            }}
          >
            <X size={30} />
          </button>
        </div>
        <hr />

        <form
          className="flex flex-col gap-5 mt-5"
          onSubmit={handleSubmit(saveCourse)}
        >
          <input
            type="text"
            className="input"
            placeholder="Name"
            disabled={isSubmitting}
            required
            {...register('name')}
          />
          <input
            type="text"
            className="input"
            placeholder="Description"
            disabled={isSubmitting}
            required
            {...register('description')}
          />
          <button className="btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader className="animate-spin mx-auto" />
            ) : (
              'Save'
            )}
          </button>
          {error ? (
            <div className="text-red-500 p-3 font-semibold border rounded-md bg-red-50">
              {error}
            </div>
          ) : null}
        </form>
      </Modal>
    </Layout>
  );
}
