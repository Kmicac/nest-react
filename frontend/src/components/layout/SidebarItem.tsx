import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarItemProps {
  children: ReactNode;
  to: string;
}

export default function SidebarItem({ children, to }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      exact
      className="sidebar-menu-item"
      activeClassName="sidebar-menu-item-active"
    >
      <span className="sidebar-menu-item-content">{children}</span>
    </NavLink>
  );
}
