## My Auth App - Node.js

Guía paso a paso para comenzar con Node.js, creando una aplicación de autenticación y utilizando Docker:

Requisitos previos

- Instalar Node.js
- Instalar Docker
- Instalar Docker Compose

### 1. Crear un nuevo proyecto Node.js

Abre la terminal o el símbolo del sistema y ejecuta los siguientes comandos para crear un nuevo proyecto Node.js y configurarlo con un archivo package.json básico.:
```ssh
mkdir my-auth-app
cd my-auth-app
npm init -y
```

**'mkdir my-auth-app'**: Este comando crea un nuevo directorio llamado **'my-auth-app'**. 
El comando **'mkdir'** es una abreviatura de "make directory" (crear directorio) y se utiliza para crear un directorio en la ubicación especificada.

**'cd my-auth-app'**: Este comando cambia el directorio actual al directorio **'my-auth-app'** que acabamos de crear. 
El comando **'cd significa'** "change directory" (cambiar directorio) y se utiliza para navegar entre diferentes directorios en la línea de comandos.

**'npm init -y'**: Este comando inicializa un nuevo proyecto Node.js en el directorio actual (**'my-auth-app'**) y crea un archivo **'package.json'** básico con configuraciones predeterminadas. 
El comando **'npm init'** se utiliza para configurar un proyecto Node.js y crear un archivo **'package.json'**, que almacena información importante sobre el proyecto, como su nombre, versión, descripción, dependencias y scripts. 
La opción **'-y'** le indica a npm que utilice valores predeterminados para todas las configuraciones y no pregunte al usuario para obtener detalles adicionales.

### 2. Instalar las dependencias necesarias
```ssh
npm install express jsonwebtoken dotenv mongoose bcrypt
```

Esto instalará Express, jsonwebtoken, dotenv, mongoose y bcrypt. 
Express es el marco de aplicación web, jsonwebtoken se usa para crear y verificar tokens JWT, dotenv nos permite trabajar con variables de entorno, mongoose es un ODM para MongoDB y bcrypt nos ayudará a encriptar y verificar contraseñas.

### 3. Configurar scripts y variables de entorno
En **'package.json'**, agrega lo siguiente en la sección de scripts:
```json
"start": "node app.js",
"dev": "nodemon app.js"
```
Crea un archivo **'.env'** en la raíz del proyecto y añade tus claves secretas para firmar los tokens y la URL de conexión de MongoDB:
```env
JWT_SECRET=mysecretpassword
JWT_REFRESH_SECRET=myrefreshsecretpassword
MONGODB_URI=mongodb://localhost:27017/my_auth_app
```

### 4. Crear la estructura básica del proyecto
Crea los siguientes archivos en la raíz del proyecto:

- **'app.js'**: archivo principal de la aplicación.
- **'User.js'**: archivo del modelo de usuario.

Crea una carpeta llamada models y, dentro de ella, crea un archivo **'User.js'** con el siguiente contenido:

```js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

Crea un archivo **'app.js'** en la raíz del proyecto con el siguiente contenido:

```js
const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

dotenv.config();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authenticateRefreshToken(req, res, next) {
  const token = req.body.token;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.sendStatus(400);

  try {
    const newUser = new User({ username, password });
    await newUser.save();
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send('Error al registrar el usuario');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.sendStatus(400);

  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.sendStatus(401);
  }

  const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '30m' });
  const refreshToken = jwt.sign({ username: user.username }, JWT_REFRESH_SECRET);

  res.json({ accessToken, refreshToken });
});

app.post('/token', authenticateRefreshToken, (req, res) => {
  const accessToken = jwt.sign({ username: req.user.username }, JWT_SECRET, { expiresIn: '30m' });
  res.json({ accessToken });
});

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
```

### 5. Configurar Docker
Crea un archivo **'Dockerfile'** en la raíz del proyecto con el siguiente contenido:
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Crea un archivo **'docker-compose.yml'** en la raíz del proyecto con el siguiente contenido:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - JWT_SECRET=mysecretpassword
      - JWT_REFRESH_SECRET=myrefreshsecretpassword
      - MONGODB_URI=mongodb://mongo:27017/my_auth_app
    depends_on:
      - mongo
  mongo:
    image: mongo:4.4
    ports:
      - '27017:27017'
    environment:
      - MONGO_INITDB_DATABASE=my_auth_app
```

Crea un archivo **'.dockerignore'** en la raíz del proyecto con el siguiente contenido:

```dockerignore
node_modules
package-lock.json
```

Es importante tener este fichero para que Docker no copie los módulos de Node.js y el fichero **'package-lock.json'** al contenedor, ya que estos ficheros se instalarán en el contenedor cuando se construya la imagen.
Si no tenemos este fichero, Docker copiará los módulos de Node.js y el fichero **'package-lock.json'** al contenedor, lo que hará que la construcción de la imagen sea más lenta. 
Además tendremos problemas de arranque de la aplicación, ya que la imágen se construirá con los módulos generados en el sistema operativo del desarrollador, y no en el sistema operativo del contenedor.

### 6. Ejecutar la aplicación

Para ejecutar la aplicación localmente (sin Docker), ejecuta:

```sh
node app.js
```

Para ejecutar la aplicación utilizando Docker y Docker Compose, ejecuta:

```sh
docker-compose up
```
