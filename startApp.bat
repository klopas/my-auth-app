@echo off
echo Deteniendo y eliminando contenedores Docker...
docker-compose down

#echo Eliminando carpeta node_modules y package-lock.json...
#rmdir /s /q node_modules
#del /f package-lock.json

#echo Instalando paquetes NPM...
#start /WAIT npm install

echo Construyendo y ejecutando contenedores Docker...
docker-compose build
docker-compose up
