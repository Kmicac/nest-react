import { useEffect, useState } from 'react';
import { Loader, X } from 'react-feather';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';

import useAuth from '../../hooks/useAuth';
import UpdateUserRequest from '../../models/user/UpdateUserRequest';
import userService from '../../services/UserService';
import Modal from '../shared/Modal';

interface UpdateDataModalProps {
  show: boolean;
  onClose: () => void;
}

export default function UpdateDataModal({
  show,
  onClose,
}: UpdateDataModalProps) {
  const { authenticatedUser, setAuthenticatedUser } = useAuth();
  const [error, setError] = useState<string>();

  const { data, isLoading } = useQuery(
    ['update-data-user', authenticatedUser?.id],
    () => userService.findOne(authenticatedUser.id),
    {
      enabled: show && Boolean(authenticatedUser?.id),
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    reset,
  } = useForm<UpdateUserRequest>();

  useEffect(() => {
    if (!show || !data) {
      return;
    }

    setValue('firstName', data.firstName);
    setValue('lastName', data.lastName);
    setValue('username', data.username);
    setValue('password', '');
  }, [show, data, setValue]);

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  const handleUpdateData = async (updateUserRequest: UpdateUserRequest) => {
    if (!data || !authenticatedUser?.id) {
      return;
    }

    try {
      const payload = { ...updateUserRequest };

      if (payload.username === data.username) {
        delete payload.username;
      }

      await userService.update(authenticatedUser.id, payload);

      const updatedUser = await userService.findOne(authenticatedUser.id);
      setAuthenticatedUser(updatedUser);

      setError(undefined);
      reset({ password: '' });
      onClose();
    } catch (updateError: any) {
      setError(
        updateError?.response?.data?.message ?? 'Error updating user data',
      );
    }
  };

  return (
    <Modal show={show}>
      <div className="flex items-center">
        <h1 className="font-semibold mb-3">Update Data</h1>
        <button className="ml-auto focus:outline-none" onClick={handleClose}>
          <X size={30} />
        </button>
      </div>
      <hr />

      {isLoading || !data ? (
        <div className="py-8">
          <Loader className="mx-auto animate-spin" />
        </div>
      ) : (
        <form
          className="flex flex-col gap-5 mt-5"
          onSubmit={handleSubmit(handleUpdateData)}
        >
          <div className="flex flex-col gap-5 sm:flex-row">
            <input
              type="text"
              className="input sm:w-1/2"
              placeholder="First Name"
              disabled={isSubmitting}
              {...register('firstName')}
            />
            <input
              type="text"
              className="input sm:w-1/2"
              placeholder="Last Name"
              disabled={isSubmitting}
              {...register('lastName')}
            />
          </div>

          <input
            type="text"
            className="input"
            placeholder="Username"
            disabled={isSubmitting}
            {...register('username')}
          />

          <input
            type="password"
            className="input"
            placeholder="New password (optional)"
            disabled={isSubmitting}
            {...register('password')}
          />

          <button className="btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader className="animate-spin mx-auto" />
            ) : (
              'Save Changes'
            )}
          </button>

          {error ? (
            <div className="text-red-500 p-3 font-semibold border rounded-md bg-red-50">
              {error}
            </div>
          ) : null}
        </form>
      )}
    </Modal>
  );
}
