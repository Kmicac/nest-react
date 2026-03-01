import { Heart, Users } from 'react-feather';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';

import Layout from '../components/layout';
import useAuth from '../hooks/useAuth';
import Course from '../models/course/Course';
import courseService from '../services/CourseService';
import statsService from '../services/StatsService';

function CourseList({
  courses,
  isLoading,
  emptyText,
  icon,
}: {
  courses: Course[];
  isLoading: boolean;
  emptyText: string;
  icon: 'users' | 'heart';
}) {
  if (isLoading) {
    return <p className="text-sm text-gray-500 mt-3">Cargando...</p>;
  }

  if (courses.length < 1) {
    return <p className="text-sm text-gray-500 mt-3">{emptyText}</p>;
  }

  return (
    <div className="mt-3 flex flex-col divide-y">
      {courses.map((course) => (
        <Link
          key={course.id}
          to={`/courses/${course.id}`}
          className="no-underline py-3 flex items-center gap-3"
        >
          {course.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.name}
              className="h-12 w-16 rounded-md border object-cover"
            />
          ) : (
            <div className="h-12 w-16 rounded-md border bg-gray-100" />
          )}

          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {course.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {course.description}
            </p>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                {icon === 'users' ? <Users size={12} /> : <Heart size={12} />}
                {icon === 'users'
                  ? `${course.enrolledUsersCount ?? 0} inscritos`
                  : 'Favorito'}
              </span>
            </div>
          </div>

          <p className="ml-auto text-xs text-gray-500 whitespace-nowrap">
            {new Date(course.dateCreated).toLocaleDateString()}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { authenticatedUser } = useAuth();
  const isUser = authenticatedUser.role === 'user';
  const showUsersStat = ['admin', 'editor'].includes(authenticatedUser.role);

  const { data: stats, isLoading: statsLoading } = useQuery(
    'stats',
    statsService.getStats,
    {
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  );

  const { data: latestCoursesResponse, isLoading: latestCoursesLoading } =
    useQuery(
      'latest-courses',
      () =>
        courseService.findAll({
          page: 1,
          limit: 5,
          sortBy: 'dateCreated',
          sortOrder: 'DESC',
        }),
      {
        refetchOnWindowFocus: false,
        staleTime: 10000,
      },
    );

  const { data: favoriteCoursesResponse, isLoading: favoriteCoursesLoading } =
    useQuery(
      'favorite-courses',
      () =>
        courseService.findAll({
          page: 1,
          limit: 5,
          sortBy: 'dateCreated',
          sortOrder: 'DESC',
          favoritesOnly: true,
        }),
      {
        enabled: isUser,
        refetchOnWindowFocus: false,
        staleTime: 10000,
      },
    );

  const latestCourses: Course[] = latestCoursesResponse?.data ?? [];
  const favoriteCourses: Course[] = favoriteCoursesResponse?.data ?? [];

  return (
    <Layout>
      <h1 className="font-semibold text-3xl mb-5">Dashboard</h1>
      <hr />

      <div className="mt-5 flex flex-col gap-5">
        {!statsLoading && stats ? (
          <div
            className={
              showUsersStat
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-4xl mx-auto'
            }
          >
            {showUsersStat ? (
              <div className="card shadow text-white bg-blue-500">
                <h1 className="font-semibold sm:text-4xl text-center mb-3">
                  {stats.numberOfUsers}
                </h1>
                <p className="text-center sm:text-lg font-semibold">Users</p>
              </div>
            ) : null}

            <div className="card shadow text-white bg-indigo-500">
              <h1 className="font-semibold sm:text-4xl mb-3 text-center">
                {stats.numberOfCourses}
              </h1>
              <p className="text-center sm:text-lg font-semibold">Courses</p>
            </div>

            <div className="card shadow text-white bg-green-500">
              <h1 className="font-semibold sm:text-4xl mb-3 text-center">
                {stats.numberOfContents}
              </h1>
              <p className="text-center sm:text-lg font-semibold">Contents</p>
            </div>
          </div>
        ) : null}

        {isUser ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="card shadow">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Novedades</h2>
                <Link to="/courses" className="text-sm no-underline">
                  Ver todos
                </Link>
              </div>

              <CourseList
                courses={latestCourses}
                isLoading={latestCoursesLoading}
                emptyText="No hay cursos recientes."
                icon="users"
              />
            </div>

            <div className="card shadow">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">My Favorites</h2>
                <Link
                  to="/courses"
                  className="text-sm no-underline"
                >{`Ver en cursos`}</Link>
              </div>

              <CourseList
                courses={favoriteCourses}
                isLoading={favoriteCoursesLoading}
                emptyText="Aun no marcaste cursos como favoritos."
                icon="heart"
              />
            </div>
          </div>
        ) : (
          <div className="card shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Novedades</h2>
              <Link to="/courses" className="text-sm no-underline">
                Ver todos
              </Link>
            </div>

            <CourseList
              courses={latestCourses}
              isLoading={latestCoursesLoading}
              emptyText="No hay cursos recientes."
              icon="users"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
