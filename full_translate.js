const fs = require('fs');
const path = require('path');

const targetFile = path.join('parkealo-app', 'src', 'App.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Comprehensive dictionary for translation
const dict = [
  // Nav & Main
  [/Explorar/g, 'Explore'],
  [/Reservas/g, 'Reservations'],
  [/Favoritos/g, 'Favorites'],
  [/Cuenta/g, 'Account'],
  [/Configuración/g, 'Settings'],
  [/Ayuda/g, 'Help'],
  [/Host/g, 'Host'],
  [/Admin/g, 'Admin'],
  [/Renta tu parqueo fácil/g, 'Rent your parking easily'],
  
  // Login / Registration
  [/Inicia sesión/g, 'Sign In'],
  [/Iniciar sesión/g, 'Sign In'],
  [/Cerrar sesión/g, 'Logout'],
  [/Correo electrónico/g, 'Email Address'],
  [/Contraseña/g, 'Password'],
  [/¿No tienes cuenta\?/g, "Don't have an account?"],
  [/Registrarse/g, 'Sign Up'],
  [/Olvidé mi contraseña/g, 'Forgot password?'],
  [/Bienvenido de nuevo/g, 'Welcome back'],
  [/Entrar/g, 'Enter'],
  
  // Booking & Map
  [/Busca tu destino/g, 'Search your destination'],
  [/Cerca de ti/g, 'Near you'],
  [/Destinos populares/g, 'Popular destinations'],
  [/Ver detalles/g, 'View details'],
  [/Reserva ahora/g, 'Book now'],
  [/Confirmar reserva/g, 'Confirm booking'],
  [/¡Reserva exitosa!/g, 'Booking successful!'],
  [/Tu código de acceso/g, 'Your access code'],
  [/Mostrar QR/g, 'Show QR'],
  [/Llegada/g, 'Arrival'],
  [/Salida/g, 'Departure'],
  [/Duración/g, 'Duration'],
  [/Precio por hora/g, 'Price per hour'],
  [/Total a pagar/g, 'Total to pay'],
  [/Método de pago/g, 'Payment method'],
  [/Tarjeta de crédito/g, 'Credit card'],
  [/Efectivo/g, 'Cash'],
  [/Pagar/g, 'Pay'],
  
  // Status & Actions
  [/Confirmar/g, 'Confirm'],
  [/Cancelar/g, 'Cancel'],
  [/Atrás/g, 'Back'],
  [/Siguiente/g, 'Next'],
  [/Finalizar/g, 'Finish'],
  [/Cerrar/g, 'Close'],
  [/Aceptar/g, 'Accept'],
  [/Guardar/g, 'Save'],
  [/Editar/g, 'Edit'],
  [/Eliminar/g, 'Delete'],
  [/Éxito/g, 'Success'],
  [/Error/g, 'Error'],
  [/Atención/g, 'Attention'],
  
  // Descriptions & Info
  [/Ubicación/g, 'Location'],
  [/Disponibilidad/g, 'Availability'],
  [/Descripción/g, 'Description'],
  [/Servicios/g, 'Services'],
  [/Seguridad 24\/7/g, '24/7 Security'],
  [/Techado/g, 'Covered'],
  [/Cámaras/g, 'Cameras'],
  [/Iluminación/g, 'Lighting'],
  [/Accesibilidad/g, 'Accessibility'],
  
  // Misc
  [/No tienes reserva aquí/g, 'No reservation found here'],
  [/Este código QR pertenece a/g, 'This QR code belongs to'],
  [/No tienes ninguna reserva activa/g, 'You have no active reservation'],
  [/Explorar parqueos/g, 'Explore parking spots'],
  [/Mis Vehículos/g, 'My Vehicles'],
  [/Notificaciones/g, 'Notifications'],
  [/Mensajes/g, 'Messages'],
  [/Historial/g, 'History'],
  [/Soporte/g, 'Support'],
  [/Restaurantes/g, 'Restaurants'],
  [/Comercios/g, 'Shops'],
  [/Parqueos/g, 'Parking Spots'],
  [/Parqueo/g, 'Parking'],
  [/Renta/g, 'Rent'],
  [/Placa/g, 'License Plate'],
  [/Vehículo/g, 'Vehicle'],
  [/Marca/g, 'Make'],
  [/Modelo/g, 'Model'],
  [/Color/g, 'Color'],
  [/Año/g, 'Year'],
  [/ninguna/g, 'none'],
  [/reserva activa en este parqueo/g, 'active booking in this parking'],
  [/Descarga Parkealo para reservar este parqueo y hacer check-in/g, 'Download Parkealo to reserve this spot and check-in'],
  [/Descargar en/g, 'Download on'],
  [/Descargar/g, 'Download']
];

dict.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

// Final cleanup: Remove all extra empty lines
// This regex matches 3 or more consecutive newlines and replaces them with 2
// It also trims trailing whitespace from each line
let lines = content.split('\n');
let cleanedLines = [];
let emptyCount = 0;

for (let line of lines) {
  let trimmed = line.trimEnd();
  if (trimmed === '') {
    emptyCount++;
  } else {
    emptyCount = 0;
  }
  
  if (emptyCount <= 1) {
    cleanedLines.push(trimmed);
  }
}

fs.writeFileSync(targetFile, cleanedLines.join('\n'));
console.log('Full translation and code optimization complete.');
