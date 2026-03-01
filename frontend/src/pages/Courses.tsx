import { useEffect, useMemo, useState } from 'react';
import { Loader, Plus, RefreshCcw, X } from 'react-feather';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from 'react-query';

import CoursesTable from '../components/courses/CoursesTable';
import Layout from '../components/layout';
import FilterDropdown, {
  FilterDropdownSection,
} from '../components/shared/FilterDropdown';
import ImageDropzone from '../components/shared/ImageDropzone';
import Modal from '../components/shared/Modal';
import PageBrandFixed from '../components/shared/PageBrandFixed';
import useAuth from '../hooks/useAuth';
import useDebouncedValue from '../hooks/useDebouncedValue';
import CreateCourseRequest from '../models/course/CreateCourseRequest';
import courseService from '../services/CourseService';

export default function Courses() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [favoritesFilter, setFavoritesFilter] = useState<'all' | 'favorites'>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<'dateCreated' | 'name' | 'description'>(
    'dateCreated',
  );
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [addCourseShow, setAddCourseShow] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [addCourseImage, setAddCourseImage] = useState<File | null>(null);

  const { authenticatedUser } = useAuth();

  const debouncedName = useDebouncedValue(name);
  const debouncedDescription = useDebouncedValue(description);

  const queryParams = useMemo(
    () => ({
      name: debouncedName || undefined,
      description: debouncedDescription || undefined,
      favoritesOnly:
        authenticatedUser.role === 'user' && favoritesFilter === 'favorites'
          ? true
          : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      debouncedName,
      debouncedDescription,
      authenticatedUser.role,
      favoritesFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
  );

  const {
    data: coursesResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery(
    ['courses', queryParams],
    () => courseService.findAll(queryParams),
    {
      keepPreviousData: true,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  );

  const courses = coursesResponse?.data ?? [];
  const total = coursesResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filterSections: FilterDropdownSection[] = useMemo(() => {
    const sections: FilterDropdownSection[] = [
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
    ];

    if (authenticatedUser.role === 'user') {
      sections.push({
        id: 'favorites',
        label: 'Favorites',
        selectedValue: favoritesFilter,
        options: [
          { label: 'All', value: 'all' },
          { label: 'My Favorites', value: 'favorites' },
        ],
        onSelect: (value) => {
          setFavoritesFilter(value as 'all' | 'favorites');
          setPage(1);
        },
      });
    }

    return sections;
  }, [authenticatedUser.role, favoritesFilter, limit, sortBy, sortOrder]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<CreateCourseRequest>();

  const saveCourse = async (createCourseRequest: CreateCourseRequest) => {
    try {
      await courseService.save({
        ...createCourseRequest,
        image: addCourseImage,
      });
      await queryClient.invalidateQueries('courses');
      setAddCourseShow(false);
      setAddCourseImage(null);
      reset();
      setError(undefined);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? 'Error creating course');
    }
  };

  return (
    <Layout>
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="font-semibold text-3xl">Manage Courses</h1>
        <PageBrandFixed />
      </div>
      <hr />

      <div className="my-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {authenticatedUser.role !== 'user' ? (
          <button
            className="btn flex gap-2 w-full sm:w-auto justify-center"
            onClick={() => setAddCourseShow(true)}
          >
            <Plus /> Add Course
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center justify-end gap-2">
          <FilterDropdown sections={filterSections} />
          <button
            type="button"
            aria-label="Refresh courses"
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

      <CoursesTable
        data={courses}
        isLoading={isLoading}
        onEnrollmentChanged={() => refetch()}
        onFavoriteChanged={() => refetch()}
      />

      <p className="mt-3 text-center text-sm text-gray-600">
        Page {page} of {totalPages} | Total: {total}
      </p>

      <Modal show={addCourseShow}>
        <div className="flex">
          <h1 className="font-semibold mb-3">Add Course</h1>
          <button
            className="ml-auto focus:outline-none"
            onClick={() => {
              reset();
              setAddCourseImage(null);
              setAddCourseShow(false);
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

          <ImageDropzone
            label="Course image"
            file={addCourseImage}
            onFileChange={(file) => setAddCourseImage(file)}
            onRemoveImage={() => setAddCourseImage(null)}
            disabled={isSubmitting}
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
