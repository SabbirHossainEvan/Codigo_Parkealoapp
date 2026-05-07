const fs = require('fs');
const path = require('path');

const targetFile = path.join('parkealo-app', 'src', 'App.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const translations = [
  [/Explorar/g, 'Explore'],
  [/Reservas/g, 'Reservations'],
  [/Favoritos/g, 'Favorites'],
  [/Cuenta/g, 'Account'],
  [/Configuración/g, 'Settings'],
  [/Ayuda/g, 'Help'],
  [/Cerrar sesión/g, 'Logout'],
  [/Inicia sesión/g, 'Sign In'],
  [/Correo electrónico/g, 'Email address'],
  [/Contraseña/g, 'Password'],
  [/Olvidé mi contraseña/g, 'Forgot password?'],
  [/¿No tienes cuenta\?/g, "Don't have an account?"],
  [/Registrarse/g, 'Sign Up'],
  [/Renta tu parqueo fácil/g, 'Rent your parking easily'],
  [/No tienes reserva aquí/g, 'No reservation found here'],
  [/Este código QR pertenece a/g, 'This QR code belongs to'],
  [/No tienes ninguna reserva activa/g, 'You have no active reservation'],
  [/Explorar parqueos/g, 'Explore parking spots'],
  [/Descargar/g, 'Download'],
  [/Cerrar/g, 'Close'],
  [/Aceptar/g, 'Accept'],
  [/Cancelar/g, 'Cancel'],
  [/Confirmar/g, 'Confirm'],
  [/Atrás/g, 'Back'],
  [/Siguiente/g, 'Next'],
  [/Finalizar/g, 'Finish'],
  [/Reserva ahora/g, 'Book now'],
  [/Precio/g, 'Price'],
  [/Ubicación/g, 'Location'],
  [/Disponibilidad/g, 'Availability'],
  [/Historial/g, 'History'],
  [/Mis Vehículos/g, 'My Vehicles'],
  [/Métodos de Pago/g, 'Payment Methods'],
  [/Soporte/g, 'Support'],
  [/Notificaciones/g, 'Notifications'],
  [/Mensajes/g, 'Messages'],
  [/Bienvenido/g, 'Welcome'],
  [/Exitoso/g, 'Successful'],
  [/Atención/g, 'Attention'],
  [/Restaurantes/g, 'Restaurants'],
  [/Comercios/g, 'Shops'],
  [/Renta/g, 'Rent'],
  [/Parqueo/g, 'Parking'],
  [/Dueño/g, 'Owner'],
  [/Usuario/g, 'User'],
  [/Invitado/g, 'Guest']
];

translations.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

// Remove massive gaps between lines while keeping some spacing
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(targetFile, content);
console.log('Translation and cleanup successful.');
