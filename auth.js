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
        let useAnonKey = method === 'GET';
        let authHeader = useAnonKey ? `Bearer ${SUPABASE_ANON_KEY}` : `Bearer ${localStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY}`;
        
        const options = { method, headers: { ...this.headers, 'Authorization': authHeader } };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
            options.headers['Prefer'] = 'return=representation';
        }
        
        try {
            const response = await fetch(`${this.url}/rest/v1${endpoint}`, options);
            
            const contentType = response.headers.get('content-type');
            let data = null;
            
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                data = text ? JSON.parse(text) : null;
            }
            
            if (response.status === 401 && method === 'GET') {
                options.headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
                const retryResponse = await fetch(`${this.url}/rest/v1${endpoint}`, options);
                if (retryResponse.ok) {
                    const retryText = await retryResponse.text();
                    return retryText ? JSON.parse(retryText) : null;
                }
                throw new Error('No se pudo obtener datos');
            }
            
            if (!response.ok) {
                const errorMsg = data?.message || data?.error?.message || data?.msg || `Error ${response.status}`;
                throw new Error(errorMsg);
            }
            
            connectionStatus = 'connected';
            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch' || error.message.includes('network')) {
                connectionStatus = 'disconnected';
                throw new Error('Sin conexion a internet');
            }
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
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ email, password, data: options.data })
                });
                const data = await response.json();
                
                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.');
                    }
                    throw new Error(data.msg || data.error_description || 'Error al registrar');
                }
                
                if (data.session) {
                    localStorage.setItem('sb_access_token', data.session.access_token);
                    localStorage.setItem('sb_refresh_token', data.session.refresh_token);
                }
                
                return data;
            } catch (error) {
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    throw new Error('Error de conexión. Verifica tu internet.');
                }
                throw error;
            }
        },

        async getSession() {
            const accessToken = localStorage.getItem('sb_access_token');
            const refreshToken = localStorage.getItem('sb_refresh_token');
            
            if (!accessToken) {
                return { data: { session: null } };
            }
            
            try {
                const response = await fetch(`${supabase.url}/auth/v1/users/me`, {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                if (!response.ok) {
                    return { data: { session: null }, error: new Error('Sesión inválida') };
                }
                
                const user = await response.json();
                
                return {
                    data: {
                        session: {
                            access_token: accessToken,
                            refresh_token: refreshToken,
                            user: user
                        }
                    }
                };
            } catch (error) {
                return { data: { session: null }, error };
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
            localStorage.removeItem('sb_access_token');
            localStorage.removeItem('sb_refresh_token');
            localStorage.removeItem('supabase_auth_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_nombre');
            localStorage.removeItem('user_is_admin');
        }
    },

    storage: {
        async upload(path, file, accessToken) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`${supabase.url}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY,
                        'x-upsert': 'true'
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    console.error('Error upload:', response.status, text);
                    throw new Error(`Error al subir archivo: ${response.status}`);
                }
                
                const data = await response.json();
                connectionStatus = 'connected';
                return data;
            } catch (error) {
                console.error('Upload error:', error);
                throw new Error(error.message || 'Error al subir archivo');
            }
        },

        async getPublicUrl(path) {
            return { publicUrl: `${supabase.url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` };
        }
    }
};

// ===== FUNCIONES DE AUTENTICACIÓN =====

const ADMIN_EMAILS = [
    'admin@ms.upla.edu.pe',
    'andymendozavillanueva@gmail.com'
];

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
        const userId = localStorage.getItem('user_id');
        const userEmail = localStorage.getItem('user_email');
        
        if (!userId) {
            return null;
        }
        
        const isAdminEmail = ADMIN_EMAILS.includes(userEmail?.toLowerCase());
        
        let profile = null;
        try {
            const profiles = await supabase.request('GET', `/profiles?id=eq.${userId}&select=*`);
            profile = profiles.length > 0 ? profiles[0] : null;
        } catch (e) {
            console.warn('No se pudo obtener perfil, usando datos basicos');
        }
        
        return {
            id: userId,
            email: userEmail,
            nombreCompleto: profile?.nombre_completo || userEmail,
            isAdmin: profile?.is_admin === true || profile?.is_admin === 'true' || isAdminEmail
        };
    } catch (error) {
        console.error('Error en obtenerUsuarioActual:', error);
        const userId = localStorage.getItem('user_id');
        const userEmail = localStorage.getItem('user_email');
        if (userId) {
            return { id: userId, email: userEmail, isAdmin: false };
        }
        return null;
    }
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
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error(data.msg || 'Correo o contraseña incorrectos');
            }
            throw new Error(data.msg || 'Error al iniciar sesión');
        }
        
        if (!data.access_token) {
            throw new Error('No se pudo iniciar sesión');
        }
        
        let userId = '';
        let userEmail = email;
        
        if (data.user) {
            userId = data.user.id || '';
            userEmail = data.user.email || email;
        }
        
        localStorage.setItem('sb_access_token', data.access_token);
        localStorage.setItem('sb_refresh_token', data.refresh_token || '');
        localStorage.setItem('user_email', userEmail);
        localStorage.setItem('user_id', userId);
        
        return data;
    } catch (error) {
        throw new Error(error.message || 'Error al iniciar sesión');
    }
}

function logout() {
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_nombre');
    localStorage.removeItem('user_is_admin');
}

function esAdmin() {
    return localStorage.getItem('user_is_admin') === '1';
}

function esHorarioVisualizacion() {
    return true; // Visualización siempre disponible
}

function activarVisualizacion() {
    localStorage.setItem('visualizacion_activada', 'true');
}

function desactivarVisualizacion() {
    localStorage.removeItem('visualizacion_activada');
}

function activarVisualizacionAutomatica() {
    localStorage.setItem('visualizacion_automatica_activada', 'true');
}

function desactivarVisualizacionAutomatica() {
    localStorage.setItem('visualizacion_automatica_activada', 'false');
}

function isVisualizacionAutomaticaActivada() {
    return localStorage.getItem('visualizacion_automatica_activada') !== 'false';
}

function estaAutenticado() {
    const token = localStorage.getItem('sb_access_token');
    if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
        return false;
    }
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            localStorage.removeItem('sb_access_token');
            return false;
        }
        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        
        if (exp < now) {
            localStorage.removeItem('sb_access_token');
            localStorage.removeItem('sb_refresh_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_nombre');
            localStorage.removeItem('user_is_admin');
            return false;
        }
        return true;
    } catch (e) {
        localStorage.removeItem('sb_access_token');
        return false;
}
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
    if (!accessToken) throw new Error('No hay sesion activa. Inicia sesion primero.');
    
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');
    if (!userId) throw new Error('Usuario no encontrado. Inicia sesion nuevamente.');
    
    const num = parseInt(numeroSemana);
    if (isNaN(num) || num < 1 || num > 16) throw new Error('Numero de semana invalido. Debe ser entre 1 y 16.');
    
    const user = { id: userId, email: userEmail };

    const extension = archivo.name.split('.').pop();
    const nombreArchivo = `${user.id}_semana${num}_${Date.now()}.${extension}`;
    const rutaArchivo = `${user.id}/${nombreArchivo}`;

    try {
        await supabase.storage.upload(rutaArchivo, archivo, accessToken);
    } catch (uploadError) {
        console.error('Error al subir archivo:', uploadError);
        const errorMsg = uploadError.message || 'Error al subir archivo';
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            throw new Error('No tienes permiso para subir. Verifica que las politicas RLS del bucket esten configuradas.');
        }
        throw new Error(errorMsg);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${rutaArchivo}`;
    
    const result = await supabase.request('POST', '/trabajos', {
        usuario_id: user.id,
        numero_semana: num,
        nombre_archivo: archivo.name,
        ruta_storage: publicUrl,
        descripcion: descripcion,
        estado: 'pendiente'
    });
    
    return result;
}

async function subirEnlace(enlace, numeroSemana, descripcion = '', plataforma = '') {
    const accessToken = localStorage.getItem('sb_access_token');
    if (!accessToken) throw new Error('No hay sesion activa. Inicia sesion primero.');
    
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');
    if (!userId) throw new Error('Usuario no encontrado. Inicia sesion nuevamente.');
    
    const num = parseInt(numeroSemana);
    if (isNaN(num) || num < 1 || num > 16) throw new Error('Numero de semana invalido. Debe ser entre 1 y 16.');
    
    let plataformaNombre = '';
    if (plataforma === 'genially') {
        plataformaNombre = 'Genially';
    } else if (plataforma === 'canva') {
        plataformaNombre = 'Canva';
    }
    
    const nombreArchivo = `${plataformaNombre}: ${enlace}`;
    
    const result = await supabase.request('POST', '/trabajos', {
        usuario_id: userId,
        numero_semana: num,
        nombre_archivo: nombreArchivo,
        ruta_storage: enlace,
        descripcion: descripcion,
        estado: 'pendiente'
    });
    
    return result;
}

async function eliminarTrabajo(trabajoId) {
    return await supabase.request('DELETE', `/trabajos?id=eq.${trabajoId}`);
}

async function cambiarEstado(trabajoId, estado) {
    const accessToken = localStorage.getItem('sb_access_token');
    if (!accessToken) {
        throw new Error('No hay sesión activa');
    }
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/trabajos?id=eq.${trabajoId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ estado })
    });
    
    if (!response.ok) {
        throw new Error('Error al actualizar estado');
    }
    
    return { success: true };
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

// ===== GEMINI AI INTEGRATION =====

const GEMINI_MODEL = 'gemini-2.0-flash'; // rápido y gratis

function convertToGeminiMessages(messages) {
    const systemMsg = messages.find(m => m.role === 'system');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hola' }] });
    }

    return { contents, systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined };
}

async function callAI(messages, onChunk = null) {
    if (!window.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY no configurada. Agrega tu API key en config.js');
    }

    const { contents, systemInstruction } = convertToGeminiMessages(messages);
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const key = window.GEMINI_API_KEY;

    if (onChunk) {
        const url = `${baseUrl}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`;
        const body = { contents };
        if (systemInstruction) body.systemInstruction = systemInstruction;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');

            for (const line of lines) {
                try {
                    const json = JSON.parse(line.slice(6));
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        fullContent += text;
                        onChunk(fullContent);
                    }
                } catch {}
            }
        }

        return fullContent;
    } else {
        const url = `${baseUrl}/${GEMINI_MODEL}:generateContent?key=${key}`;
        const body = { contents };
        if (systemInstruction) body.systemInstruction = systemInstruction;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Error ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
}

async function getSystemPrompt() {
    const unidades = window.UNIDADES || [];
    const weekKnowledge = window.WEEK_KNOWLEDGE || {};
    
    return `Eres DataNauta, un asistente experto en Bases de Datos del curso "Base de Datos II" de la Universidad Peruana Los Andes (UPLA).

INSTRUCCIONES:
- Respondes SIEMPRE en español, de forma clara y educativa.
- Usa los iconos de Font Awesome cuando ayude a la legibilidad: <i class="fa-solid fa-database"></i>, <i class="fa-solid fa-link"></i>, <i class="fa-solid fa-bolt"></i>, etc.
- Si te preguntan por comandos SQL incluye ejemplos prácticos.
- Si preguntan por conceptos de BD da explicaciones completas pero concisas.
- NO inventes información sobre semanas o temas del curso. Usa SOLO lo que está en el contexto.

ESTRUCTURA DEL CURSO:
${JSON.stringify(unidades, null, 2)}

INFORMACIÓN DE CADA SEMANA:
${JSON.stringify(weekKnowledge, null, 2)}

RESPONDE CON UN FORMATO COMO ESTE:
<strong>Concepto:</strong> explicación breve
<br><br><strong>Ejemplo:</strong> código o aplicación práctica
<br><br><strong>Importancia:</strong> por qué es relevante`;
}

// ===== EXPORTAR =====
if (typeof window !== 'undefined') {
    window.PortafolioAuth = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        STORAGE_BUCKET,
        callAI,
        getSystemPrompt,
        ADMIN_EMAILS,
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
        subirEnlace,
        eliminarTrabajo,
        cambiarEstado,
        obtenerEstadisticas,
        requireAuth,
        requireGuest,
        esHorarioVisualizacion,
        activarVisualizacion,
        desactivarVisualizacion,
        activarVisualizacionAutomatica,
        desactivarVisualizacionAutomatica,
        isVisualizacionAutomaticaActivada
    };
    
    console.log('[PortafolioAuth] Sistema inicializado');
}
