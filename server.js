require("dotenv").config();

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Configuración de la base de datos (ACTUALIZA LA CONTRASEÑA)
const dbConfig = {
    user: 'sa',
    password: 'Pass159=2026+', //  CONTRASEÑA DE SQL
    server: 'MV-LAB-01',
    port: 1433,
    database: 'EmotionalSchool',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Configuración del transporte de correo (ACTUALIZA TUS CREDENCIALES)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'joanpino31@gmail.com',      // <-- TU CORREO
        pass: 'bskh P9fI WY3u WpB' // <-- CONTRASEÑA DE APLICACIÓN (no la normal)
    }
});


sql.connect(dbConfig).then(pool => {
    console.log('Conectado a SQL Server');
    app.locals.pool = pool;
}).catch(err => {
    console.error('Error al conectar a SQL Server:', err);
});

// -------------------- RUTAS DE LA API --------------------

// LOGIN
app.post('/api/login', async (req, res) => {
    const { identificador, password } = req.body;
    try {
        const pool = req.app.locals.pool;
        let result;
        if (identificador === 'Director') {
            result = await pool.request()
                .input('rol', sql.VarChar, 'director')
                .input('password', sql.VarChar, password)
                .query('SELECT * FROM Usuarios WHERE Rol = @rol AND Password = @password');
        } else {
            result = await pool.request()
                .input('correo', sql.VarChar, identificador)
                .input('password', sql.VarChar, password)
                .query('SELECT * FROM Usuarios WHERE Correo = @correo AND Password = @password');
        }
        if (result.recordset.length > 0) {
            const usuario = result.recordset[0];
            delete usuario.Password;
            res.json({ success: true, usuario });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// REGISTRO (nuevo usuario)
app.post('/api/registro', async (req, res) => {
    const { tipoId, identificacion, nombres, apellidos, correo, password, fechaNac, rol } = req.body;
    if (rol === 'director') {
        return res.status(400).json({ success: false, message: 'No puedes registrar un director' });
    }
    try {
        const pool = req.app.locals.pool;
        const check = await pool.request()
            .input('correo', sql.VarChar, correo)
            .query('SELECT Id FROM Usuarios WHERE Correo = @correo');
        if (check.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }
        const result = await pool.request()
            .input('tipoId', sql.VarChar, tipoId)
            .input('identificacion', sql.VarChar, identificacion)
            .input('nombres', sql.VarChar, nombres)
            .input('apellidos', sql.VarChar, apellidos)
            .input('correo', sql.VarChar, correo)
            .input('password', sql.VarChar, password)
            .input('fechaNac', sql.Date, fechaNac)
            .input('rol', sql.VarChar, rol)
            .query(`
                INSERT INTO Usuarios (TipoIdentificacion, Identificacion, Nombres, Apellidos, Correo, Password, FechaNac, Rol, Estado)
                VALUES (@tipoId, @identificacion, @nombres, @apellidos, @correo, @password, @fechaNac, @rol, 'Activo');
                SELECT SCOPE_IDENTITY() AS Id;
            `);
        res.json({ success: true, id: result.recordset[0].Id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// OBTENER TODOS LOS USUARIOS (para director)
app.get('/api/usuarios', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const result = await pool.request().query(`
            SELECT u.Id, u.TipoIdentificacion, u.Identificacion, u.Nombres, u.Apellidos, u.Correo, u.FechaNac, u.Rol, u.Estado, u.AulaId, a.Nombre as Aula
            FROM Usuarios u
            LEFT JOIN Aulas a ON u.AulaId = a.Id
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// OBTENER UN USUARIO POR ID (para editar)
app.get('/api/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const pool = req.app.locals.pool;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Usuarios WHERE Id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        const usuario = result.recordset[0];
        delete usuario.Password;
        res.json(usuario);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// ACTUALIZAR USUARIO (PUT)
app.put('/api/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    const { tipoId, identificacion, nombres, apellidos, correo, fechaNac, rol, estado, password } = req.body;
    try {
        const pool = req.app.locals.pool;
        let query = `
            UPDATE Usuarios SET
                TipoIdentificacion = @tipoId,
                Identificacion = @identificacion,
                Nombres = @nombres,
                Apellidos = @apellidos,
                Correo = @correo,
                FechaNac = @fechaNac,
                Rol = @rol,
                Estado = @estado
        `;
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('tipoId', sql.VarChar, tipoId)
            .input('identificacion', sql.VarChar, identificacion)
            .input('nombres', sql.VarChar, nombres)
            .input('apellidos', sql.VarChar, apellidos)
            .input('correo', sql.VarChar, correo)
            .input('fechaNac', sql.Date, fechaNac)
            .input('rol', sql.VarChar, rol)
            .input('estado', sql.VarChar, estado);
        if (password) {
            query += ', Password = @password';
            request.input('password', sql.VarChar, password);
        }
        query += ' WHERE Id = @id';
        await request.query(query);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// CAMBIAR ESTADO (PATCH)
app.patch('/api/usuarios/:id/estado', async (req, res) => {
    const id = req.params.id;
    const { estado } = req.body;
    try {
        const pool = req.app.locals.pool;
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar, estado)
            .query('UPDATE Usuarios SET Estado = @estado WHERE Id = @id');
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// ELIMINAR USUARIO
app.delete('/api/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const pool = req.app.locals.pool;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Usuarios WHERE Id = @id');
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// AULAS
app.post('/api/aulas', async (req, res) => {
    const { nombre, capacidad } = req.body;
    try {
        const pool = req.app.locals.pool;
        const result = await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('capacidad', sql.Int, capacidad)
            .query('INSERT INTO Aulas (Nombre, Capacidad) VALUES (@nombre, @capacidad); SELECT SCOPE_IDENTITY() AS Id;');
        res.json({ success: true, id: result.recordset[0].Id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.put('/api/aulas/:id/asignar-profesor', async (req, res) => {
    const aulaId = req.params.id;
    const { profesorId } = req.body;
    try {
        const pool = req.app.locals.pool;
        await pool.request()
            .input('aulaId', sql.Int, aulaId)
            .input('profesorId', sql.Int, profesorId)
            .query('UPDATE Aulas SET ProfesorId = @profesorId WHERE Id = @aulaId');
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.put('/api/usuarios/:id/asignar-aula', async (req, res) => {
    const usuarioId = req.params.id;
    const { aulaId } = req.body;
    try {
        const pool = req.app.locals.pool;
        await pool.request()
            .input('usuarioId', sql.Int, usuarioId)
            .input('aulaId', sql.Int, aulaId)
            .query('UPDATE Usuarios SET AulaId = @aulaId WHERE Id = @usuarioId');
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.get('/api/aulas', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const result = await pool.request().query(`
            SELECT a.*, u.Nombres + ' ' + u.Apellidos as ProfesorNombre
            FROM Aulas a
            LEFT JOIN Usuarios u ON a.ProfesorId = u.Id
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.get('/api/estudiantes-libres', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const result = await pool.request()
            .query("SELECT Id, Nombres, Apellidos FROM Usuarios WHERE Rol = 'estudiante' AND AulaId IS NULL");
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================
// Solicitar token
app.post('/api/recuperar', async (req, res) => {
    const { correo } = req.body;
    try {
        const pool = req.app.locals.pool;
        const userResult = await pool.request()
            .input('correo', sql.VarChar, correo)
            .query('SELECT Id FROM Usuarios WHERE Correo = @correo');
        if (userResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Correo no registrado' });
        }
        const usuarioId = userResult.recordset[0].Id;

        // Generar token
        const token = crypto.randomBytes(32).toString('hex');
        const expiracion = new Date(Date.now() + 3600000); // 1 hora

        // Guardar token en BD
        await pool.request()
            .input('usuarioId', sql.Int, usuarioId)
            .input('token', sql.VarChar, token)
            .input('expiracion', sql.DateTime, expiracion)
            .query('INSERT INTO PasswordResets (UsuarioId, Token, Expiracion) VALUES (@usuarioId, @token, @expiracion)');

        // Enviar correo (el usuario deberá copiar el token y volver a la página)
        const mailOptions = {
            from: '"Emotional School" <tu_correo@gmail.com>',
            to: correo,
            subject: 'Recuperación de contraseña - Emotional School',
            html: `
                <p>Has solicitado restablecer tu contraseña.</p>
                <p>Tu token de recuperación es: <strong>${token}</strong></p>
                <p>Ingresa este token en la página de recuperación, junto con tu nueva contraseña.</p>
                <p>El token expirará en 1 hora.</p>
                <p>Si no solicitaste esto, ignora este mensaje.</p>
            `
        };
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Correo enviado con el token' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Restablecer contraseña con token
app.post('/api/restablecer', async (req, res) => {
    const { token, nuevaPassword } = req.body;
    try {
        const pool = req.app.locals.pool;
        // Buscar token válido, no usado y no expirado
        const resetResult = await pool.request()
            .input('token', sql.VarChar, token)
            .query(`
                SELECT UsuarioId FROM PasswordResets 
                WHERE Token = @token AND Usado = 0 AND Expiracion > GETDATE()
            `);
        if (resetResult.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
        }
        const usuarioId = resetResult.recordset[0].UsuarioId;

        // Actualizar contraseña
        await pool.request()
            .input('password', sql.VarChar, nuevaPassword)
            .input('usuarioId', sql.Int, usuarioId)
            .query('UPDATE Usuarios SET Password = @password WHERE Id = @usuarioId');

        // Marcar token como usado
        await pool.request()
            .input('token', sql.VarChar, token)
            .query('UPDATE PasswordResets SET Usado = 1 WHERE Token = @token');

        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});