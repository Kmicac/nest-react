import Course from '../models/course/Course';
import CourseQuery from '../models/course/CourseQuery';
import CreateCourseRequest from '../models/course/CreateCourseRequest';
import UpdateCourseRequest from '../models/course/UpdateCourseRequest';
import apiService from './ApiService';
import { PaginatedResponse } from './UserService';

class CourseService {
  async save(createCourseRequest: CreateCourseRequest): Promise<void> {
    const payload = new FormData();

    payload.append('name', createCourseRequest.name);
    payload.append('description', createCourseRequest.description);

    if (createCourseRequest.image) {
      payload.append('image', createCourseRequest.image);
    }

    await apiService.post('/api/courses', payload);
  }

  async findAll(courseQuery: CourseQuery): Promise<PaginatedResponse<Course>> {
    const response = await apiService.get<Course[] | PaginatedResponse<Course>>(
      '/api/courses',
      { params: courseQuery },
    );

    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        total: response.data.length,
      };
    }

    return {
      data: response.data?.data ?? [],
      total: response.data?.total ?? 0,
      page: response.data?.page,
      limit: response.data?.limit,
    };
  }

  async findOne(id: string): Promise<Course> {
    return (await apiService.get<Course>(`/api/courses/${id}`)).data;
  }

  async update(
    id: string,
    updateCourseRequest: UpdateCourseRequest,
  ): Promise<void> {
    const payload = new FormData();

    if (updateCourseRequest.name !== undefined) {
      payload.append('name', updateCourseRequest.name);
    }

    if (updateCourseRequest.description !== undefined) {
      payload.append('description', updateCourseRequest.description);
    }

    if (updateCourseRequest.image) {
      payload.append('image', updateCourseRequest.image);
    }

    if (updateCourseRequest.removeImage !== undefined) {
      payload.append('removeImage', String(updateCourseRequest.removeImage));
    }

    await apiService.put(`/api/courses/${id}`, payload);
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`/api/courses/${id}`);
  }

  async enroll(id: string): Promise<void> {
    await apiService.post(`/api/courses/${id}/enrollment`);
  }

  async unenroll(id: string): Promise<void> {
    await apiService.delete(`/api/courses/${id}/enrollment`);
  }

  async favorite(id: string): Promise<void> {
    await apiService.post(`/api/courses/${id}/favorite`);
  }

  async unfavorite(id: string): Promise<void> {
    await apiService.delete(`/api/courses/${id}/favorite`);
  }
}

export default new CourseService();
