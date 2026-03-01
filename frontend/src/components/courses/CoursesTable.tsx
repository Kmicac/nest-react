import { useState } from 'react';
import {
  AlertTriangle,
  Heart,
  Image as ImageIcon,
  Loader,
  X,
} from 'react-feather';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import useAuth from '../../hooks/useAuth';
import Course from '../../models/course/Course';
import UpdateCourseRequest from '../../models/course/UpdateCourseRequest';
import courseService from '../../services/CourseService';
import ImageDropzone from '../shared/ImageDropzone';
import Modal from '../shared/Modal';
import Table from '../shared/Table';
import TableItem from '../shared/TableItem';

interface UsersTableProps {
  data: Course[];
  isLoading: boolean;
  onEnrollmentChanged?: () => Promise<unknown> | void;
  onFavoriteChanged?: () => Promise<unknown> | void;
}

export default function CoursesTable({
  data,
  isLoading,
  onEnrollmentChanged,
  onFavoriteChanged,
}: UsersTableProps) {
  const { authenticatedUser } = useAuth();
  const [deleteShow, setDeleteShow] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [error, setError] = useState<string>();
  const [updateShow, setUpdateShow] = useState<boolean>(false);
  const [selectedCourseImageUrl, setSelectedCourseImageUrl] = useState<
    string | null
  >(null);
  const [updateCourseImage, setUpdateCourseImage] = useState<File | null>(null);
  const [removeCourseImage, setRemoveCourseImage] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string>();
  const [enrollmentUpdatingId, setEnrollmentUpdatingId] = useState<string>();
  const [favoriteError, setFavoriteError] = useState<string>();
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
    setValue,
  } = useForm<UpdateCourseRequest>();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await courseService.delete(selectedCourseId);
      setDeleteShow(false);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? 'Error deleting course');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (updateCourseRequest: UpdateCourseRequest) => {
    try {
      await courseService.update(selectedCourseId, {
        ...updateCourseRequest,
        image: updateCourseImage,
        removeImage: removeCourseImage,
      });

      setUpdateShow(false);
      setUpdateCourseImage(null);
      setSelectedCourseImageUrl(null);
      setRemoveCourseImage(false);
      reset();
      setError(undefined);
    } catch (error: any) {
      setError(error?.response?.data?.message ?? 'Error updating course');
    }
  };

  const handleEnrollment = async (courseId: string, isEnrolled: boolean) => {
    try {
      setEnrollmentError(undefined);
      setEnrollmentUpdatingId(courseId);

      if (isEnrolled) {
        await courseService.unenroll(courseId);
      } else {
        await courseService.enroll(courseId);
      }

      if (onEnrollmentChanged) {
        await onEnrollmentChanged();
      }
    } catch (error: any) {
      setEnrollmentError(
        error?.response?.data?.message ?? 'Error updating enrollment status',
      );
    } finally {
      setEnrollmentUpdatingId(undefined);
    }
  };

  const handleFavorite = async (courseId: string, isFavorite: boolean) => {
    try {
      setFavoriteError(undefined);
      setFavoriteUpdatingId(courseId);

      if (isFavorite) {
        await courseService.unfavorite(courseId);
      } else {
        await courseService.favorite(courseId);
      }

      if (onFavoriteChanged) {
        await onFavoriteChanged();
      }
    } catch (error: any) {
      setFavoriteError(
        error?.response?.data?.message ?? 'Error updating favorites',
      );
    } finally {
      setFavoriteUpdatingId(undefined);
    }
  };

  return (
    <>
      {enrollmentError ? (
        <div className="text-red-500 p-3 font-semibold border rounded-md bg-red-50 mb-3">
          {enrollmentError}
        </div>
      ) : null}

      {favoriteError ? (
        <div className="text-red-500 p-3 font-semibold border rounded-md bg-red-50 mb-3">
          {favoriteError}
        </div>
      ) : null}

      <div className="table-container">
        <Table
          columns={['Image', 'Name', 'Description', 'Enrollment', 'Created']}
        >
          {isLoading
            ? null
            : data.map(
                ({
                  id,
                  name,
                  description,
                  imageUrl,
                  isEnrolled,
                  isFavorite,
                  dateCreated,
                }) => (
                  <tr key={id}>
                    <TableItem className="w-[110px]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="h-14 w-20 rounded-md border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-20 rounded-md border bg-gray-100 text-gray-400 flex items-center justify-center">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </TableItem>
                    <TableItem className="w-[220px]">
                      <Link to={`/courses/${id}`}>{name}</Link>
                    </TableItem>
                    <TableItem className="w-[38%]">{description}</TableItem>
                    <TableItem className="whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isEnrolled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isEnrolled ? 'Enrolled' : 'Not enrolled'}
                      </span>
                    </TableItem>
                    <TableItem className="w-[150px] whitespace-nowrap">
                      {new Date(dateCreated).toLocaleDateString()}
                    </TableItem>
                    <TableItem className="text-right whitespace-nowrap">
                      {authenticatedUser.role === 'user' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={
                              isFavorite
                                ? 'Remove from favorites'
                                : 'Add to favorites'
                            }
                            className={`h-9 w-9 rounded-full border flex items-center justify-center transition-colors ${
                              isFavorite
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() =>
                              handleFavorite(id, Boolean(isFavorite))
                            }
                            disabled={favoriteUpdatingId === id}
                          >
                            {favoriteUpdatingId === id ? (
                              <Loader className="animate-spin" size={14} />
                            ) : (
                              <Heart
                                size={16}
                                fill={isFavorite ? 'currentColor' : 'none'}
                              />
                            )}
                          </button>

                          <button
                            className="btn px-3 py-2"
                            onClick={() =>
                              handleEnrollment(id, Boolean(isEnrolled))
                            }
                            disabled={enrollmentUpdatingId === id}
                          >
                            {enrollmentUpdatingId === id ? (
                              <Loader
                                className="mx-auto animate-spin"
                                size={16}
                              />
                            ) : isEnrolled ? (
                              'Unenroll'
                            ) : (
                              'Enroll'
                            )}
                          </button>
                        </div>
                      ) : null}

                      {['admin', 'editor'].includes(authenticatedUser.role) ? (
                        <button
                          className="text-indigo-600 hover:text-indigo-900 focus:outline-none"
                          onClick={() => {
                            setSelectedCourseId(id);
                            setSelectedCourseImageUrl(imageUrl ?? null);
                            setUpdateCourseImage(null);
                            setRemoveCourseImage(false);

                            setValue('name', name);
                            setValue('description', description);

                            setUpdateShow(true);
                          }}
                        >
                          Edit
                        </button>
                      ) : null}
                      {authenticatedUser.role === 'admin' ? (
                        <button
                          className="text-red-600 hover:text-red-900 ml-3 focus:outline-none"
                          onClick={() => {
                            setSelectedCourseId(id);
                            setDeleteShow(true);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </TableItem>
                  </tr>
                ),
              )}
        </Table>
        {!isLoading && data.length < 1 ? (
          <div className="text-center my-5 text-gray-500">
            <h1>Empty</h1>
          </div>
        ) : null}
      </div>
      {/* Delete Course Modal */}
      <Modal show={deleteShow}>
        <AlertTriangle size={30} className="text-red-500 mr-5 fixed" />
        <div className="ml-10">
          <h3 className="mb-2 font-semibold">Delete Course</h3>
          <hr />
          <p className="mt-2">
            Are you sure you want to delete the course? All of course's data
            will be permanently removed.
            <br />
            This action cannot be undone.
          </p>
        </div>
        <div className="flex flex-row gap-3 justify-end mt-5">
          <button
            className="btn"
            onClick={() => {
              setError(undefined);
              setDeleteShow(false);
            }}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="btn danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader className="mx-auto animate-spin" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
        {error ? (
          <div className="text-red-500 p-3 font-semibold border rounded-md bg-red-50">
            {error}
          </div>
        ) : null}
      </Modal>
      {/* Update Course Modal */}
      <Modal show={updateShow}>
        <div className="flex">
          <h1 className="font-semibold mb-3">Update Course</h1>
          <button
            className="ml-auto focus:outline-none"
            onClick={() => {
              setUpdateShow(false);
              setError(undefined);
              setUpdateCourseImage(null);
              setSelectedCourseImageUrl(null);
              setRemoveCourseImage(false);
              reset();
            }}
          >
            <X size={30} />
          </button>
        </div>
        <hr />

        <form
          className="flex flex-col gap-5 mt-5"
          onSubmit={handleSubmit(handleUpdate)}
        >
          <input
            type="text"
            className="input"
            placeholder="Name"
            required
            {...register('name')}
          />
          <input
            type="text"
            className="input"
            placeholder="Description"
            required
            disabled={isSubmitting}
            {...register('description')}
          />

          <ImageDropzone
            label="Course image"
            file={updateCourseImage}
            currentImageUrl={removeCourseImage ? null : selectedCourseImageUrl}
            onFileChange={(file) => {
              setUpdateCourseImage(file);
              setRemoveCourseImage(false);
            }}
            onRemoveImage={() => {
              if (updateCourseImage) {
                setUpdateCourseImage(null);
                return;
              }

              if (selectedCourseImageUrl) {
                setRemoveCourseImage(true);
              }
            }}
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
    </>
  );
}
