// ==================== INICIALIZACIÓN ====================
const API_URL = 'http://localhost:3000/api'; // Cambia si es necesario

let sesionActual = null;
let recuperacionTokenSolicitado = false; // para el flujo de dos pasos

// ==================== NAVEGACIÓN ====================
function mostrarSeccion(seccionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(seccionId).classList.add('active');
    if (seccionId === 'director') cargarVistaDirector();
    else if (seccionId === 'profesor') cargarVistaProfesor();
    else if (seccionId === 'estudiante') cargarVistaEstudiante();
}

document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        mostrarSeccion(section);
    });
});

// ==================== REGISTRO ====================
document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipoId = document.getElementById('reg-tipo-id').value;
    const identificacion = document.getElementById('reg-identificacion').value.trim();
    const nombres = document.getElementById('reg-nombres').value.trim();
    const apellidos = document.getElementById('reg-apellidos').value.trim();
    const correo = document.getElementById('reg-correo').value.trim();
    const password = document.getElementById('reg-pass').value.trim();
    const fechaNac = document.getElementById('reg-fecha').value;
    const rol = document.getElementById('reg-rol').value;

    if (rol === 'estudiante' && tipoId !== 'TI') {
        mostrarMensaje('mensaje-registro', 'Los estudiantes solo pueden usar Tarjeta de Identidad (TI)', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoId, identificacion, nombres, apellidos, correo, password, fechaNac, rol })
        });
        const data = await response.json();
        if (data.success) {
            mostrarMensaje('mensaje-registro', 'Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            document.getElementById('form-registro').reset();
        } else {
            mostrarMensaje('mensaje-registro', data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('mensaje-registro', 'Error de conexión con el servidor', 'error');
    }
});

// ==================== LOGIN ====================
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identificador = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-pass').value.trim();

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador, password })
        });
        const data = await response.json();
        if (data.success) {
            sesionActual = data.usuario;
            document.getElementById('user-name').textContent = `${sesionActual.Nombres} ${sesionActual.Apellidos} (${sesionActual.Rol})`;
            document.getElementById('logout-btn').style.display = 'inline-block';
            document.getElementById('director-link').style.display = sesionActual.Rol === 'director' ? 'inline-block' : 'none';
            document.getElementById('profesor-link').style.display = sesionActual.Rol === 'profesor' ? 'inline-block' : 'none';
            document.getElementById('estudiante-link').style.display = sesionActual.Rol === 'estudiante' ? 'inline-block' : 'none';
            mostrarMensaje('mensaje-login', 'Sesión iniciada correctamente', 'success');
            mostrarSeccion('inicio');
        } else {
            mostrarMensaje('mensaje-login', data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('mensaje-login', 'Error de conexión con el servidor', 'error');
    }
});

// ==================== RECUPERAR CONTRASEÑA (real) ====================
document.getElementById('form-recuperar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('rec-correo').value.trim();

    if (!recuperacionTokenSolicitado) {
        // Primer paso: solicitar token
        try {
            const response = await fetch(`${API_URL}/recuperar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo })
            });
            const data = await response.json();
            if (data.success) {
                mostrarMensaje('mensaje-recuperar', 'Se ha enviado un token a tu correo', 'success');
                document.getElementById('recuperar-paso2').style.display = 'block';
                recuperacionTokenSolicitado = true;
            } else {
                mostrarMensaje('mensaje-recuperar', data.message, 'error');
            }
        } catch (error) {
            console.error(error);
            mostrarMensaje('mensaje-recuperar', 'Error de conexión', 'error');
        }
    } else {
        // Segundo paso: restablecer con token
        const token = document.getElementById('rec-token').value.trim();
        const nuevaPass = document.getElementById('rec-nueva-pass').value.trim();
        const confirmPass = document.getElementById('rec-confirm-pass').value.trim();
        if (nuevaPass !== confirmPass) {
            mostrarMensaje('mensaje-recuperar', 'Las contraseñas no coinciden', 'error');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/restablecer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nuevaPassword: nuevaPass })
            });
            const data = await response.json();
            if (data.success) {
                mostrarMensaje('mensaje-recuperar', 'Contraseña actualizada. Ahora puedes iniciar sesión.', 'success');
                document.getElementById('form-recuperar').reset();
                document.getElementById('recuperar-paso2').style.display = 'none';
                recuperacionTokenSolicitado = false;
                setTimeout(() => mostrarSeccion('login'), 2000);
            } else {
                mostrarMensaje('mensaje-recuperar', data.message, 'error');
            }
        } catch (error) {
            console.error(error);
            mostrarMensaje('mensaje-recuperar', 'Error de conexión', 'error');
        }
    }
});

// ==================== CERRAR SESIÓN ====================
document.getElementById('logout-btn').addEventListener('click', () => {
    sesionActual = null;
    document.getElementById('user-name').textContent = '';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('director-link').style.display = 'none';
    document.getElementById('profesor-link').style.display = 'none';
    document.getElementById('estudiante-link').style.display = 'none';
    mostrarSeccion('inicio');
});

// ==================== FUNCIONES DIRECTOR ====================
async function cargarVistaDirector() {
    if (!sesionActual || sesionActual.Rol !== 'director') return;
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        const tbody = document.getElementById('tbody-usuarios-director');
        tbody.innerHTML = '';
        usuarios.forEach(u => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${u.Id}</td>
                <td>${u.TipoIdentificacion || ''}</td>
                <td>${u.Identificacion || ''}</td>
                <td>${u.Nombres}</td>
                <td>${u.Apellidos}</td>
                <td>${u.Correo}</td>
                <td>${u.FechaNac ? u.FechaNac.split('T')[0] : ''}</td>
                <td>${u.Rol}</td>
                <td>${u.Aula || 'Sin aula'}</td>
                <td>${u.Estado}</td>
                <td>
                    <button class="btn-edit" data-id="${u.Id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-toggle-estado" data-id="${u.Id}" data-estado="${u.Estado}"><i class="fas fa-toggle-${u.Estado === 'Activo' ? 'on' : 'off'}"></i></button>
                    <button class="btn-delete" data-id="${u.Id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(fila);
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                editarUsuario(id);
            });
        });
        document.querySelectorAll('.btn-toggle-estado').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                const estadoActual = e.target.closest('button').getAttribute('data-estado');
                cambiarEstadoUsuario(id, estadoActual);
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                eliminarUsuario(id);
            });
        });

        await actualizarListaAulasDirector();
    } catch (error) {
        console.error(error);
        alert('Error al cargar datos del director');
    }
}

function mostrarModalUsuario(usuario = null) {
    const modal = document.getElementById('modal-usuario');
    document.getElementById('modal-titulo').innerHTML = usuario ? '<i class="fas fa-user-edit"></i> Editar Usuario' : '<i class="fas fa-user-plus"></i> Agregar Usuario';
    if (usuario) {
        document.getElementById('modal-id').value = usuario.Id;
        document.getElementById('modal-tipo-id').value = usuario.TipoIdentificacion || 'TI';
        document.getElementById('modal-identificacion').value = usuario.Identificacion || '';
        document.getElementById('modal-nombres').value = usuario.Nombres;
        document.getElementById('modal-apellidos').value = usuario.Apellidos;
        document.getElementById('modal-correo').value = usuario.Correo;
        document.getElementById('modal-pass').value = '';
        document.getElementById('modal-fecha').value = usuario.FechaNac ? usuario.FechaNac.split('T')[0] : '';
        document.getElementById('modal-rol').value = usuario.Rol;
        document.getElementById('modal-estado').value = usuario.Estado;
    } else {
        document.getElementById('modal-id').value = '';
        document.getElementById('modal-tipo-id').value = 'TI';
        document.getElementById('modal-identificacion').value = '';
        document.getElementById('modal-nombres').value = '';
        document.getElementById('modal-apellidos').value = '';
        document.getElementById('modal-correo').value = '';
        document.getElementById('modal-pass').value = '';
        document.getElementById('modal-fecha').value = '';
        document.getElementById('modal-rol').value = 'estudiante';
        document.getElementById('modal-estado').value = 'Activo';
    }
    modal.style.display = 'flex';
}

function cerrarModalUsuario() {
    document.getElementById('modal-usuario').style.display = 'none';
}

document.getElementById('form-modal-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modal-id').value;
    const tipoId = document.getElementById('modal-tipo-id').value;
    const identificacion = document.getElementById('modal-identificacion').value.trim();
    const nombres = document.getElementById('modal-nombres').value.trim();
    const apellidos = document.getElementById('modal-apellidos').value.trim();
    const correo = document.getElementById('modal-correo').value.trim();
    const password = document.getElementById('modal-pass').value.trim();
    const fechaNac = document.getElementById('modal-fecha').value;
    const rol = document.getElementById('modal-rol').value;
    const estado = document.getElementById('modal-estado').value;

    if (rol === 'estudiante' && tipoId !== 'TI') {
        alert('Los estudiantes solo pueden usar Tarjeta de Identidad (TI)');
        return;
    }

    const usuarioData = { tipoId, identificacion, nombres, apellidos, correo, fechaNac, rol, estado };
    if (password) usuarioData.password = password;

    try {
        let response;
        if (id) {
            response = await fetch(`${API_URL}/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuarioData)
            });
        } else {
            response = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuarioData)
            });
        }
        const data = await response.json();
        if (data.success) {
            cerrarModalUsuario();
            cargarVistaDirector();
        } else {
            alert(data.message || 'Error al guardar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
});

async function editarUsuario(id) {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`);
        const usuario = await response.json();
        mostrarModalUsuario(usuario);
    } catch (error) {
        console.error(error);
        alert('Error al obtener datos del usuario');
    }
}

async function cambiarEstadoUsuario(id, estadoActual) {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await response.json();
        if (data.success) {
            cargarVistaDirector();
        } else {
            alert('Error al cambiar estado');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function eliminarUsuario(id) {
    if (id == sesionActual?.Id) {
        alert('No puedes eliminar tu propia cuenta');
        return;
    }
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            cargarVistaDirector();
        } else {
            alert('Error al eliminar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

function mostrarFormAula() {
    document.getElementById('form-aula').style.display = 'block';
}

function cancelarFormAula() {
    document.getElementById('form-aula').style.display = 'none';
}

async function crearAula() {
    const nombre = document.getElementById('aula-nombre').value.trim();
    const capacidad = parseInt(document.getElementById('aula-capacidad').value);
    if (!nombre || capacidad < 1) {
        alert('Complete los datos');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/aulas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, capacidad })
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('aula-nombre').value = '';
            document.getElementById('aula-capacidad').value = 20;
            cancelarFormAula();
            actualizarListaAulasDirector();
        } else {
            alert('Error al crear aula');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function actualizarListaAulasDirector() {
    try {
        const response = await fetch(`${API_URL}/aulas`);
        const aulas = await response.json();
        const div = document.getElementById('lista-aulas-director');
        div.innerHTML = '<h4>Aulas existentes:</h4>';
        aulas.forEach(aula => {
            div.innerHTML += `
                <div class="aula-card">
                    <div>
                        <strong>${aula.Nombre}</strong> (Capacidad: ${aula.Capacidad})<br>
                        Profesor: ${aula.ProfesorNombre || 'Sin asignar'}
                    </div>
                    <div>
                        <button onclick="asignarProfesor(${aula.Id})"><i class="fas fa-user-tie"></i> Asignar Profesor</button>
                        <button onclick="verEstudiantesAula(${aula.Id})"><i class="fas fa-users"></i> Ver estudiantes</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error(error);
    }
}

async function asignarProfesor(aulaId) {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        const profesores = usuarios.filter(u => u.Rol === 'profesor');
        let lista = 'Seleccione profesor (ID):\n';
        profesores.forEach(p => {
            lista += `${p.Id}: ${p.Nombres} ${p.Apellidos}\n`;
        });
        const idProf = prompt(lista + 'Ingrese ID del profesor:');
        if (idProf) {
            const profId = parseInt(idProf);
            if (profesores.some(p => p.Id === profId)) {
                const res = await fetch(`${API_URL}/aulas/${aulaId}/asignar-profesor`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profesorId: profId })
                });
                const data = await res.json();
                if (data.success) {
                    actualizarListaAulasDirector();
                } else {
                    alert('Error al asignar profesor');
                }
            } else {
                alert('ID inválido');
            }
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function verEstudiantesAula(aulaId) {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        const estudiantes = usuarios.filter(u => u.Rol === 'estudiante' && u.AulaId === aulaId);
        let mensaje = 'Estudiantes en el aula:\n';
        estudiantes.forEach(e => mensaje += `- ${e.Nombres} ${e.Apellidos} (${e.Estado})\n`);
        alert(mensaje || 'No hay estudiantes');
    } catch (error) {
        console.error(error);
    }
}

// ==================== FUNCIONES PROFESOR ====================
async function cargarVistaProfesor() {
    if (!sesionActual || sesionActual.Rol !== 'profesor') return;
    try {
        const responseAulas = await fetch(`${API_URL}/aulas`);
        const aulas = await responseAulas.json();
        const misAulas = aulas.filter(a => a.ProfesorId === sesionActual.Id);
        const divAulas = document.getElementById('aulas-profesor');
        divAulas.innerHTML = '<h3>Mis Aulas</h3>';
        if (misAulas.length === 0) {
            divAulas.innerHTML += '<p>No tienes aulas asignadas.</p>';
        } else {
            const responseUsuarios = await fetch(`${API_URL}/usuarios`);
            const usuarios = await responseUsuarios.json();
            misAulas.forEach(aula => {
                const estudiantes = usuarios.filter(u => u.Rol === 'estudiante' && u.AulaId === aula.Id);
                divAulas.innerHTML += `
                    <div class="aula-card">
                        <div>
                            <strong>${aula.Nombre}</strong> (${estudiantes.length}/${aula.Capacidad} estudiantes)
                        </div>
                        <div>
                            <button onclick="verDetalleAulaProfesor(${aula.Id})"><i class="fas fa-eye"></i> Ver estudiantes</button>
                            <button onclick="asignarEstudianteAula(${aula.Id})"><i class="fas fa-user-plus"></i> Agregar estudiante</button>
                        </div>
                    </div>
                `;
                if (estudiantes.length > 0) {
                    let listaEst = '<ul>';
                    estudiantes.forEach(e => {
                        listaEst += `<li>${e.Nombres} ${e.Apellidos} - Estado: ${e.Estado} 
                            <button onclick="cambiarEstadoEstudiante(${e.Id}, '${e.Estado}')"><i class="fas fa-toggle-${e.Estado === 'Activo' ? 'on' : 'off'}"></i></button>
                        </li>`;
                    });
                    listaEst += '</ul>';
                    divAulas.innerHTML += listaEst;
                }
            });
        }

        const responseLibres = await fetch(`${API_URL}/estudiantes-libres`);
        const libres = await responseLibres.json();
        const divLibres = document.getElementById('estudiantes-libres');
        divLibres.innerHTML = '<h4>Estudiantes sin aula</h4>';
        if (libres.length === 0) {
            divLibres.innerHTML += '<p>No hay estudiantes libres.</p>';
        } else {
            let lista = '<ul>';
            libres.forEach(e => {
                lista += `<li>${e.Nombres} ${e.Apellidos} (ID: ${e.Id}) <button onclick="asignarEstudianteAulaDirecto(${e.Id})"><i class="fas fa-door-open"></i> Asignar a mi aula</button></li>`;
            });
            lista += '</ul>';
            divLibres.innerHTML += lista;
        }
    } catch (error) {
        console.error(error);
        alert('Error al cargar vista profesor');
    }
}

async function cambiarEstadoEstudiante(id, estadoActual) {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await response.json();
        if (data.success) {
            cargarVistaProfesor();
        } else {
            alert('Error al cambiar estado');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

function verDetalleAulaProfesor(aulaId) {
    verEstudiantesAula(aulaId);
}

async function asignarEstudianteAula(aulaId) {
    try {
        const response = await fetch(`${API_URL}/estudiantes-libres`);
        const libres = await response.json();
        let lista = 'Seleccione estudiante (ID):\n';
        libres.forEach(e => {
            lista += `${e.Id}: ${e.Nombres} ${e.Apellidos}\n`;
        });
        const idEst = prompt(lista + 'Ingrese ID del estudiante:');
        if (idEst) {
            const estId = parseInt(idEst);
            if (libres.some(e => e.Id === estId)) {
                const res = await fetch(`${API_URL}/usuarios/${estId}/asignar-aula`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aulaId })
                });
                const data = await res.json();
                if (data.success) {
                    cargarVistaProfesor();
                } else {
                    alert('Error al asignar estudiante');
                }
            } else {
                alert('ID inválido');
            }
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function asignarEstudianteAulaDirecto(estId) {
    try {
        const responseAulas = await fetch(`${API_URL}/aulas`);
        const aulas = await responseAulas.json();
        const misAulas = aulas.filter(a => a.ProfesorId === sesionActual.Id);
        if (misAulas.length === 0) {
            alert('No tienes aulas. Primero el director debe asignarte una.');
            return;
        }
        let lista = 'Seleccione aula:\n';
        misAulas.forEach((a, index) => {
            lista += `${index + 1}: ${a.Nombre}\n`;
        });
        const opcion = prompt(lista + 'Ingrese número:');
        if (opcion) {
            const idx = parseInt(opcion) - 1;
            if (idx >= 0 && idx < misAulas.length) {
                const aula = misAulas[idx];
                const res = await fetch(`${API_URL}/usuarios/${estId}/asignar-aula`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aulaId: aula.Id })
                });
                const data = await res.json();
                if (data.success) {
                    cargarVistaProfesor();
                } else {
                    alert('Error al asignar');
                }
            } else {
                alert('Opción inválida');
            }
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

// ==================== FUNCIONES ESTUDIANTE ====================
function cargarVistaEstudiante() {
    if (!sesionActual || sesionActual.Rol !== 'estudiante') return;
    const div = document.getElementById('perfil-estudiante');
    div.innerHTML = `
        <p><i class="fas fa-user-circle"></i> <strong>Nombre:</strong> ${sesionActual.Nombres} ${sesionActual.Apellidos}</p>
        <p><i class="fas fa-envelope"></i> <strong>Correo:</strong> ${sesionActual.Correo}</p>
        <p><i class="fas fa-calendar-alt"></i> <strong>Fecha de nacimiento:</strong> ${sesionActual.FechaNac ? sesionActual.FechaNac.split('T')[0] : ''}</p>
        <p><i class="fas fa-id-card"></i> <strong>Identificación:</strong> ${sesionActual.TipoIdentificacion} ${sesionActual.Identificacion}</p>
        <p><i class="fas fa-door-open"></i> <strong>Aula:</strong> (pendiente de implementar)</p>
    `;
}

// ==================== FUNCIÓN PARA MOSTRAR MENSAJES ====================
function mostrarMensaje(divId, texto, tipo) {
    const div = document.getElementById(divId);
    div.textContent = texto;
    div.className = `mensaje ${tipo}`;
    setTimeout(() => {
        div.style.display = 'none';
    }, 3000);
}

// ==================== EXPONER FUNCIONES GLOBALES ====================
window.mostrarSeccion = mostrarSeccion;
window.mostrarFormAula = mostrarFormAula;
window.cancelarFormAula = cancelarFormAula;
window.crearAula = crearAula;
window.asignarProfesor = asignarProfesor;
window.verEstudiantesAula = verEstudiantesAula;
window.verDetalleAulaProfesor = verDetalleAulaProfesor;
window.asignarEstudianteAula = asignarEstudianteAula;
window.asignarEstudianteAulaDirecto = asignarEstudianteAulaDirecto;
window.mostrarModalUsuario = mostrarModalUsuario;
window.cerrarModalUsuario = cerrarModalUsuario;
window.cambiarEstadoEstudiante = cambiarEstadoEstudiante;