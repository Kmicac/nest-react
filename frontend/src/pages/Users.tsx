import { useEffect, useMemo, useState } from 'react';
import { Loader, Plus, RefreshCcw, X } from 'react-feather';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from 'react-query';

import Layout from '../components/layout';
import FilterDropdown, {
  FilterDropdownSection,
} from '../components/shared/FilterDropdown';
import Modal from '../components/shared/Modal';
import UsersTable from '../components/users/UsersTable';
import useAuth from '../hooks/useAuth';
import useDebouncedValue from '../hooks/useDebouncedValue';
import CreateUserRequest from '../models/user/CreateUserRequest';
import userService from '../services/UserService';

export default function Users() {
  const { authenticatedUser } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<
    'dateCreated' | 'firstName' | 'lastName' | 'username' | 'role' | 'isActive'
  >('dateCreated');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [addUserShow, setAddUserShow] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const debouncedFirstName = useDebouncedValue(firstName);
  const debouncedLastName = useDebouncedValue(lastName);
  const debouncedUsername = useDebouncedValue(username);

  const queryParams = useMemo(
    () => ({
      firstName: debouncedFirstName || undefined,
      lastName: debouncedLastName || undefined,
      username: debouncedUsername || undefined,
      role: role || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      debouncedFirstName,
      debouncedLastName,
      debouncedUsername,
      role,
      page,
      limit,
      sortBy,
      sortOrder,
    ],
  );

  const {
    data: usersResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery(
    ['users', queryParams],
    async () => {
      const response = await userService.findAll(queryParams);
      const filteredData = response.data.filter(
        (user) => user.id !== authenticatedUser?.id,
      );

      return {
        ...response,
        data: filteredData,
      };
    },
    {
      keepPreviousData: true,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  );

  const users = usersResponse?.data ?? [];
  const total = usersResponse?.total ?? 0;
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
          { label: '5 por pagina', value: '5' },
          { label: '10 por pagina', value: '10' },
          { label: '20 por pagina', value: '20' },
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
          { label: 'Fecha de creacion', value: 'dateCreated' },
          { label: 'First Name', value: 'firstName' },
          { label: 'Last Name', value: 'lastName' },
          { label: 'Username', value: 'username' },
          { label: 'Role', value: 'role' },
          { label: 'Estado', value: 'isActive' },
        ],
        onSelect: (value) => {
          setSortBy(
            value as
              | 'dateCreated'
              | 'firstName'
              | 'lastName'
              | 'username'
              | 'role'
              | 'isActive',
          );
          setPage(1);
        },
      },
      {
        id: 'order',
        label: 'Order',
        selectedValue: sortOrder,
        options: [
          { label: 'Descendente', value: 'DESC' },
          { label: 'Ascendente', value: 'ASC' },
        ],
        onSelect: (value) => {
          setSortOrder(value as 'ASC' | 'DESC');
          setPage(1);
        },
      },
    ],
    [limit, sortBy, sortOrder],
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<CreateUserRequest>();

  const saveUser = async (createUserRequest: CreateUserRequest) => {
    try {
      await userService.save(createUserRequest);
      await queryClient.invalidateQueries('users');
      setAddUserShow(false);
      setError(undefined);
      reset();
    } catch (error: any) {
      setError(error?.response?.data?.message ?? 'Error creating user');
    }
  };

  return (
    <Layout>
      <h1 className="font-semibold text-3xl mb-5">Manage Users</h1>
      <hr />

      <div className="my-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {authenticatedUser.role === 'admin' ? (
          <button
            className="btn flex gap-2 w-full sm:w-auto justify-center"
            onClick={() => setAddUserShow(true)}
          >
            <Plus /> Add User
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center justify-end gap-2">
          <FilterDropdown sections={filterSections} />
          <button
            type="button"
            aria-label="Refresh users"
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

      <div className="table-filter mt-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col md:flex-row gap-2 flex-1">
            <input
              type="text"
              className="input h-12 w-full md:w-1/4"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              className="input h-12 w-full md:w-1/4"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              type="text"
              className="input h-12 w-full md:w-1/4"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <select
              className="input h-12 w-full md:w-1/4"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="user">User</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
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

      <UsersTable data={users} isLoading={isLoading} />

      <p className="mt-3 text-center text-sm text-gray-600">
        Page {page} of {totalPages} | Total: {total}
      </p>

      <Modal show={addUserShow}>
        <div className="flex">
          <h1 className="font-semibold mb-3">Add User</h1>
          <button
            className="ml-auto focus:outline-none"
            onClick={() => {
              reset();
              setError(undefined);
              setAddUserShow(false);
            }}
          >
            <X size={30} />
          </button>
        </div>
        <hr />

        <form
          className="flex flex-col gap-5 mt-5"
          onSubmit={handleSubmit(saveUser)}
        >
          <div className="flex flex-col gap-5 sm:flex-row">
            <input
              type="text"
              className="input sm:w-1/2"
              placeholder="First Name"
              required
              disabled={isSubmitting}
              {...register('firstName')}
            />
            <input
              type="text"
              className="input sm:w-1/2"
              placeholder="Last Name"
              required
              disabled={isSubmitting}
              {...register('lastName')}
            />
          </div>
          <input
            type="text"
            className="input"
            required
            placeholder="Username"
            disabled={isSubmitting}
            {...register('username')}
          />
          <input
            type="password"
            className="input"
            required
            placeholder="Password (min 6 characters)"
            disabled={isSubmitting}
            {...register('password')}
          />
          <select
            className="input"
            required
            {...register('role')}
            disabled={isSubmitting}
          >
            <option value="user">User</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
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
