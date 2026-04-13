// ============================================
// PORTAFOLIO BASE DE DATOS II - AUTH.JS
// ============================================

const SUPABASE_URL = 'https://gxsdjbxtzxssnqvphwfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4c2RqYnh0enhzc25xdnBod2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Njk1NDEsImV4cCI6MjA5MTM0NTU0MX0.s76qBSRiQo_RysFH8Kchud_QfXL9gPPYg1kXdJ1LuIY';
const STORAGE_BUCKET = 'BDANDY';

let connectionStatus = 'checking';

const supabase = {
    url: SUPABASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },

    async request(method, endpoint, body = null) {
        const options = { method, headers: this.headers };
        if (body && method !== 'GET') options.body = JSON.stringify(body);
        
        try {
            const response = await fetch(`${this.url}/rest/v1${endpoint}`, options);
            const data = await response.json();
            
            if (!response.ok) {
                const errorMsg = data?.message || data?.error?.message || data?.msg || `Error ${response.status}`;
                throw new Error(errorMsg);
            }
            
            connectionStatus = 'connected';
            return data;
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed')) {
                connectionStatus = 'disconnected';
                throw new Error('Error de conexión. Verifica tu internet.');
            }
            connectionStatus = 'error';
            throw error;
        }
    },

    async verifyConnection() {
        try {
            const response = await fetch(`${this.url}/rest/v1/`, {
                method: 'HEAD',
                headers: this.headers
            });
            connectionStatus = response.ok ? 'connected' : 'error';
            return response.ok;
        } catch (error) {
            connectionStatus = 'disconnected';
            return false;
        }
    },

    auth: {
        async signUp(email, password, options = {}) {
            try {
                const response = await fetch(`${supabase.url}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ 
                        email: email, 
                        password: password,
                        options: options
                    })
                });
                const data = await response.json();
                
                console.log('Signup response:', response.status, data);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.');
                    }
                    if (response.status === 400) {
                        if (data.message?.includes('already registered') || data.msg?.includes('already')) {
                            throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
                        }
                        if (data.message?.includes('password')) {
                            throw new Error('La contraseña debe tener al menos 6 caracteres.');
                        }
                        throw new Error(data.message || data.error?.message || data.msg || 'Datos inválidos. Revisa tu correo y contraseña.');
                    }
                    throw new Error(data.message || data.error?.message || 'Error al registrarse');
                }
                
                connectionStatus = 'connected';
                return data;
            } catch (error) {
                console.error('Signup error:', error);
                if (error.message.includes('Failed to fetch')) {
                    connectionStatus = 'disconnected';
                    throw new Error('Error de conexión. Verifica tu internet.');
                }
                throw error;
            }
        },

        async signInWithPassword(email, password) {
            try {
                console.log('Enviando login a:', `${supabase.url}/auth/v1/token?grant_type=password`);
                console.log('Email:', email);
                
                const response = await fetch(`${supabase.url}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ 
                        email: email, 
                        password: password 
                    })
                });
                
                const data = await response.json();
                console.log('Login response:', response.status, data);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.');
                    }
                    if (response.status === 400) {
                        throw new Error(data.msg || data.error_code || 'Correo o contraseña incorrectos.');
                    }
                    throw new Error(data.error_description || data.msg || 'Error al iniciar sesión');
                }
                
                connectionStatus = 'connected';
                return data;
            } catch (error) {
                console.error('Error en signInWithPassword:', error);
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    connectionStatus = 'disconnected';
                    throw new Error('Error de conexión. Verifica tu internet.');
                }
                throw error;
            }
        },

        async signOut() {
            const accessToken = localStorage.getItem('sb_access_token');
            if (accessToken) {
                try {
                    await fetch(`${supabase.url}/auth/v1/logout`, {
                        method: 'POST',
                        headers: { ...supabase.headers, 'Authorization': `Bearer ${accessToken}` }
                    });
                } catch (e) { /* Ignore logout errors */ }
            }
            localStorage.removeItem('sb_access_token');
            localStorage.removeItem('sb_refresh_token');
            localStorage.removeItem('supabase_auth_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_nombre');
            localStorage.removeItem('user_is_admin');
        },

        async getSession() {
            const accessToken = localStorage.getItem('sb_access_token');
            if (!accessToken) return { data: { session: null } };
            
            try {
                const response = await fetch(`${supabase.url}/auth/v1/users/me`, {
                    headers: { ...supabase.headers, 'Authorization': `Bearer ${accessToken}` }
                });
                const data = await response.json();
                if (!response.ok) {
                    localStorage.removeItem('sb_access_token');
                    connectionStatus = 'error';
                    return { data: { session: null } };
                }
                connectionStatus = 'connected';
                return { data: { session: { user: data } } };
            } catch (error) {
                connectionStatus = 'disconnected';
                return { data: { session: null } };
            }
        }
    },

    storage: {
        async upload(path, file, accessToken) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`${supabase.url}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: formData
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al subir archivo');
                connectionStatus = 'connected';
                return data;
            } catch (error) {
                throw new Error(error.message || 'Error al subir archivo');
            }
        },

        async getPublicUrl(path) {
            return { publicUrl: `${supabase.url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` };
        }
    }
};

// ===== FUNCIONES DE AUTENTICACIÓN =====

function getConnectionStatus() {
    return connectionStatus;
}

async function verificarConexion() {
    connectionStatus = 'checking';
    const isConnected = await supabase.verifyConnection();
    console.log(`[PortafolioAuth] Estado de conexión: ${connectionStatus}`);
    return isConnected;
}

async function verificarSesion() {
    try {
        const { data } = await supabase.auth.getSession();
        return data.session !== null;
    } catch { return false; }
}

async function obtenerUsuarioActual() {
    try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return null;
        
        const user = data.session.user;
        let profile = null;
        
        try {
            const profiles = await supabase.request('GET', `/profiles?id=eq.${user.id}&select=*`);
            profile = profiles.length > 0 ? profiles[0] : null;
        } catch (e) {
            console.warn('No se pudo obtener perfil');
        }
        
        return {
            id: user.id,
            email: user.email,
            nombreCompleto: profile?.nombre_completo || user.email,
            isAdmin: profile?.is_admin === true || profile?.is_admin === 'true' || false
        };
    } catch { return null; }
}

async function registrar(email, password, nombreCompleto) {
    console.log('Registrando usuario:', email);
    const result = await supabase.auth.signUp(email, password, {
        data: { full_name: nombreCompleto }
    });
    
    console.log('Resultado registro:', result);
    
    if (result.error) {
        throw new Error(result.error.message || 'Error al crear usuario');
    }
    
    if (result.session) {
        localStorage.setItem('sb_access_token', result.session.access_token);
        localStorage.setItem('sb_refresh_token', result.session.refresh_token);
    }
    
    return result;
}

async function login(email, password) {
    console.log('Llamando signInWithPassword...');
    const result = await supabase.auth.signInWithPassword(email, password);
    console.log('Resultado login:', result);
    
    if (!result || !result.access_token) {
        console.log('No hay access_token en result:', result);
        throw new Error('No se pudo iniciar sesión. Verifica tus credenciales.');
    }
    
    const user = result.user || { id: '', email: email };
    
    localStorage.setItem('sb_access_token', result.access_token);
    localStorage.setItem('sb_refresh_token', result.refresh_token);
    localStorage.setItem('user_email', user.email || email);
    localStorage.setItem('user_id', user.id);
    
    return result;
}

function estaAutenticado() {
    const token = localStorage.getItem('sb_access_token');
    return token !== null && token !== undefined && token !== '';
}

function esAdmin() {
    return localStorage.getItem('user_is_admin') === '1';
}

async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_nombre');
    localStorage.removeItem('user_is_admin');
    window.location.href = 'index.html';
}

async function inicializarAuth() {
    if (estaAutenticado()) {
        try {
            const usuario = await obtenerUsuarioActual();
            if (usuario) {
                localStorage.setItem('user_id', usuario.id);
                localStorage.setItem('user_email', usuario.email);
                localStorage.setItem('user_nombre', usuario.nombreCompleto);
                localStorage.setItem('user_is_admin', usuario.isAdmin ? '1' : '0');
            }
        } catch (error) {
            console.warn('Error al inicializar auth:', error);
        }
    }
}

// ===== FUNCIONES DE TRABAJOS =====

async function obtenerTrabajos() {
    try {
        return await supabase.request('GET', '/trabajos?select=*&order=created_at.desc');
    } catch (error) {
        console.error('Error al obtener trabajos:', error);
        return [];
    }
}

async function obtenerTrabajosPorSemana(numeroSemana) {
    try {
        return await supabase.request(
            'GET',
            `/trabajos?numero_semana=eq.${numeroSemana}&select=*&order=created_at.desc`
        );
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function subirTrabajo(archivo, numeroSemana, descripcion = '') {
    const accessToken = localStorage.getItem('sb_access_token');
    if (!accessToken) throw new Error('No hay sesión activa');
    
    const user = await obtenerUsuarioActual();
    if (!user) throw new Error('Usuario no encontrado');

    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `${user.id}_semana${numeroSemana}_${Date.now()}.${extension}`;
    const rutaArchivo = `${user.id}/${nombreArchivo}`;

    await supabase.storage.upload(rutaArchivo, archivo, accessToken);
    const { publicUrl } = await supabase.storage.getPublicUrl(rutaArchivo);

    return await supabase.request('POST', '/trabajos', {
        usuario_id: user.id,
        numero_semana: numeroSemana,
        nombre_archivo: archivo.name,
        ruta_storage: publicUrl,
        descripcion: descripcion,
        estado: 'pendiente'
    });
}

async function eliminarTrabajo(trabajoId) {
    return await supabase.request('DELETE', `/trabajos?id=eq.${trabajoId}`);
}

async function cambiarEstado(trabajoId, estado) {
    return await supabase.request('PATCH', `/trabajos?id=eq.${trabajoId}`, { estado });
}

async function obtenerEstadisticas() {
    try {
        const trabajos = await obtenerTrabajos();
        let usuariosCount = 0;
        
        try {
            const usuarios = await supabase.request('GET', '/profiles?select=id');
            usuariosCount = usuarios.length;
        } catch (e) { /* Ignore */ }
        
        return {
            total: trabajos.length,
            pendientes: trabajos.filter(t => t.estado === 'pendiente').length,
            revisados: trabajos.filter(t => t.estado !== 'pendiente').length,
            estudiantes: usuariosCount
        };
    } catch {
        return { total: 0, pendientes: 0, revisados: 0, estudiantes: 0 };
    }
}

// ===== PROTECCIÓN DE RUTAS =====

function requireAuth() {
    if (!estaAutenticado()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requireGuest() {
    if (estaAutenticado()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ===== EXPORTAR =====
if (typeof window !== 'undefined') {
    window.PortafolioAuth = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        STORAGE_BUCKET,
        getConnectionStatus,
        verificarConexion,
        verificarSesion,
        obtenerUsuarioActual,
        registrar,
        login,
        logout,
        estaAutenticado,
        esAdmin,
        inicializarAuth,
        obtenerTrabajos,
        obtenerTrabajosPorSemana,
        subirTrabajo,
        eliminarTrabajo,
        cambiarEstado,
        obtenerEstadisticas,
        requireAuth,
        requireGuest
    };
    
    console.log('[PortafolioAuth] Sistema inicializado');
}
