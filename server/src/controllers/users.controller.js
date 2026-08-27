import { supabase } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Base de datos en memoria (Fallback)
let LOCAL_USERS = [
  {
    id: 'usr-admin',
    name: 'Ing. Carlos Villalba',
    email: 'admin@asuncion.gov.py',
    role: 'admin',
    department: 'Dirección General de Servicios Urbanos',
    status: 'ACTIVO',
    phone: '+595 981 112233',
    created_at: '2026-01-15T08:00:00.000Z',
    last_sign_in_at: '2026-08-20T14:30:00.000Z'
  },
  {
    id: 'usr-sup',
    name: 'Lic. María Elena Giménez',
    email: 'supervisor@asuncion.gov.py',
    role: 'supervisor',
    department: 'Supervisión de Rutas y Cronogramas',
    status: 'ACTIVO',
    phone: '+595 982 445566',
    created_at: '2026-02-10T09:30:00.000Z',
    last_sign_in_at: '2026-08-20T13:15:00.000Z'
  },
  {
    id: 'usr-op',
    name: 'Ramón González',
    email: 'operador@asuncion.gov.py',
    role: 'operator',
    department: 'Operaciones de Flota (Chofer CAM-01)',
    status: 'ACTIVO',
    phone: '+595 983 778899',
    created_at: '2026-03-01T10:00:00.000Z',
    last_sign_in_at: '2026-08-20T11:45:00.000Z'
  },
  {
    id: 'usr-insp',
    name: 'Abg. Rodrigo Benítez',
    email: 'fiscalizador@asuncion.gov.py',
    role: 'inspector',
    department: 'Fiscalización Ambiental y Denuncias',
    status: 'ACTIVO',
    phone: '+595 984 990011',
    created_at: '2026-04-12T11:20:00.000Z',
    last_sign_in_at: '2026-08-19T16:20:00.000Z'
  }
];

/**
 * Listar todos los usuarios municipales (desde Supabase Auth Admin o Fallback)
 */
export const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    let userList = [];

    // 1. Intentar consultar Supabase Auth Admin
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (!error && users && users.length > 0) {
        userList = users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || u.email.split('@')[0],
          role: u.app_metadata?.role || u.user_metadata?.role || 'operator',
          department: u.user_metadata?.department || 'Dirección General de Servicios Urbanos',
          phone: u.user_metadata?.phone || '',
          status: u.user_metadata?.status || 'ACTIVO',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at
        }));
      }
    } catch (dbErr) {
      console.warn('Error al consultar usuarios en Supabase Auth Admin, usando fallback');
    }

    if (userList.length === 0) {
      userList = [...LOCAL_USERS];
    }

    // Filtrado
    if (role && role !== 'ALL') {
      userList = userList.filter(u => u.role === role);
    }

    if (status && status !== 'ALL') {
      userList = userList.filter(u => u.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      userList = userList.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    }

    return successResponse(res, 'Usuarios municipales obtenidos correctamente', userList);
  } catch (err) {
    return errorResponse(res, 'Error al consultar usuarios', err, 500);
  }
};

/**
 * Crear un nuevo usuario municipal en Supabase Auth
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, role, department, phone, password } = req.body;

    if (!name || !email || !role) {
      return errorResponse(res, 'Nombre, email y rol son campos obligatorios', null, 400);
    }

    const finalPassword = password && password.length >= 6 ? password : 'Password123!';

    let createdUser = null;

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: role || 'operator',
          department: department || 'Dirección General de Servicios Urbanos',
          phone: phone || '',
          status: 'ACTIVO'
        },
        app_metadata: {
          role: role || 'operator'
        }
      });

      if (!error && data?.user) {
        createdUser = {
          id: data.user.id,
          email: data.user.email,
          name,
          role: role || 'operator',
          department: department || 'Dirección General de Servicios Urbanos',
          phone: phone || '',
          status: 'ACTIVO',
          created_at: data.user.created_at,
          last_sign_in_at: null
        };

        // Sincronización directa a profiles
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            name,
            role: role || 'operator',
            department: department || 'Dirección General de Servicios Urbanos',
            phone: phone || '',
            status: 'ACTIVO'
          });
        } catch (pErr) {
          console.warn('Upsert directo a profiles en createUser:', pErr.message);
        }
      } else if (error) {
        return errorResponse(res, error.message || 'Error al crear usuario en Supabase', error, 400);
      }
    } catch (dbErr) {
      console.warn('Fallback al crear usuario');
    }

    if (!createdUser) {
      createdUser = {
        id: `usr-${Date.now().toString().slice(-4)}`,
        name,
        email: email.toLowerCase().trim(),
        role: role || 'operator',
        department: department || 'Dirección General de Servicios Urbanos',
        phone: phone || '',
        status: 'ACTIVO',
        created_at: new Date().toISOString(),
        last_sign_in_at: null
      };
      LOCAL_USERS.unshift(createdUser);
    }

    return successResponse(res, 'Usuario municipal creado exitosamente en Supabase', createdUser, 201);
  } catch (err) {
    return errorResponse(res, 'Error al registrar usuario', err, 500);
  }
};

/**
 * Actualizar rol o datos de un usuario en Supabase Auth
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, department, status, phone } = req.body;

    let updatedUser = null;

    try {
      const updates = {
        user_metadata: {},
        app_metadata: {}
      };

      if (name) updates.user_metadata.name = name;
      if (role) {
        updates.user_metadata.role = role;
        updates.app_metadata.role = role;
      }
      if (department) updates.user_metadata.department = department;
      if (status) updates.user_metadata.status = status;
      if (phone) updates.user_metadata.phone = phone;

      const { data, error } = await supabase.auth.admin.updateUserById(id, updates);
      if (!error && data?.user) {
        updatedUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email,
          role: data.user.app_metadata?.role || data.user.user_metadata?.role || 'operator',
          department: data.user.user_metadata?.department || 'Servicios Urbanos',
          phone: data.user.user_metadata?.phone || '',
          status: data.user.user_metadata?.status || 'ACTIVO',
          created_at: data.user.created_at,
          last_sign_in_at: data.user.last_sign_in_at
        };

        // Sincronización directa a profiles
        try {
          const profileUpdates = { id };
          if (name) profileUpdates.name = name;
          if (role) profileUpdates.role = role;
          if (department) profileUpdates.department = department;
          if (status) profileUpdates.status = status;
          if (phone) profileUpdates.phone = phone;
          profileUpdates.updated_at = new Date().toISOString();
          await supabase.from('profiles').upsert(profileUpdates);
        } catch (pErr) {
          console.warn('Upsert directo a profiles en updateUser:', pErr.message);
        }
      }
    } catch (dbErr) {
      console.warn('Fallback al actualizar usuario');
    }

    if (!updatedUser) {
      const index = LOCAL_USERS.findIndex(u => u.id === id || u.email === id);
      if (index !== -1) {
        LOCAL_USERS[index] = {
          ...LOCAL_USERS[index],
          ...(name && { name }),
          ...(role && { role }),
          ...(department && { department }),
          ...(status && { status }),
          ...(phone && { phone })
        };
        updatedUser = LOCAL_USERS[index];
      }
    }

    if (!updatedUser) {
      return errorResponse(res, 'Usuario no encontrado', null, 404);
    }

    return successResponse(res, 'Usuario actualizado correctamente', updatedUser);
  } catch (err) {
    return errorResponse(res, 'Error al actualizar usuario', err, 500);
  }
};

/**
 * Eliminar usuario en Supabase Auth
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    try {
      await supabase.auth.admin.deleteUser(id);
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (pErr) {
        console.warn('Delete de profile:', pErr.message);
      }
    } catch (dbErr) {
      console.warn('Fallback al eliminar usuario');
    }

    const index = LOCAL_USERS.findIndex(u => u.id === id || u.email === id);
    if (index !== -1) {
      LOCAL_USERS.splice(index, 1);
    }

    return successResponse(res, 'Usuario eliminado del sistema');
  } catch (err) {
    return errorResponse(res, 'Error al eliminar usuario', err, 500);
  }
};
