import { BookOpen, Home, LogOut, Users } from 'react-feather';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';

import useAuth from '../../hooks/useAuth';
import authService from '../../services/AuthService';
import SidebarItem from './SidebarItem';

interface SidebarProps {
  className: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const history = useHistory();

  const { authenticatedUser, setAuthenticatedUser } = useAuth();

  const handleLogout = async () => {
    await authService.logout();
    setAuthenticatedUser(null);
    history.push('/login');
  };

  const sidebarBackgroundStyle = {
    backgroundImage: `linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.78) 0%,
        rgba(0, 0, 0, 0.58) 45%,
        rgba(0, 0, 0, 0.78) 100%
      ), url(${process.env.PUBLIC_URL}/sidemenu-bg.jpg)`,
  };

  return (
    <div className={'sidebar ' + className} style={sidebarBackgroundStyle}>
      <Link to="/" className="sidebar-brand">
        <img
          src="/urbano-logo-white.png"
          alt="Urbano"
          className="sidebar-brand-image"
        />
      </Link>

      <nav className="mt-8 flex flex-col gap-3 flex-grow">
        <SidebarItem to="/">
          <Home size={18} /> Dashboard
        </SidebarItem>
        <SidebarItem to="/courses">
          <BookOpen size={18} /> Courses
        </SidebarItem>
        {authenticatedUser.role === 'admin' ? (
          <SidebarItem to="/users">
            <Users size={18} /> Users
          </SidebarItem>
        ) : null}
      </nav>

      <button
        type="button"
        className="sidebar-menu-item"
        onClick={handleLogout}
      >
        <span className="sidebar-menu-item-content">
          <LogOut size={18} /> Logout
        </span>
      </button>
    </div>
  );
}
