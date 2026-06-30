import React from 'react';
import RoleProfile from '../common/RoleProfile';

const AdminProfile = (props) => (
  <RoleProfile {...props} role="server_admin" />
);

export default AdminProfile;
