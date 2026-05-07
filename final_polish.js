const fs = require('fs');
const path = require('path');

const targetFile = path.join('parkealo-app', 'src', 'App.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const dict = [
  // Verbs & Actions
  [/Reservar/g, 'Book'],
  [/Reserva/g, 'Booking'],
  [/Solicitar/g, 'Request'],
  [/Pagar/g, 'Pay'],
  [/Confirmar/g, 'Confirm'],
  [/Cancelar/g, 'Cancel'],
  [/Aceptar/g, 'Accept'],
  [/Cerrar/g, 'Close'],
  [/Entrar/g, 'Enter'],
  [/Salir/g, 'Exit'],
  [/Llegar/g, 'Arrive'],
  [/Eliminar/g, 'Remove'],
  [/Editar/g, 'Edit'],
  [/Guardar/g, 'Save'],
  [/Enviar/g, 'Send'],
  
  // Nouns
  [/Parqueo/g, 'Parking'],
  [/Parqueos/g, 'Parking Spots'],
  [/Vehículo/g, 'Vehicle'],
  [/Vehículos/g, 'Vehicles'],
  [/Persona/g, 'Person'],
  [/Correo/g, 'Email'],
  [/Contraseña/g, 'Password'],
  [/Tarjeta/g, 'Card'],
  [/Cuenta/g, 'Account'],
  [/Precio/g, 'Price'],
  [/Seguro/g, 'Insurance'],
  [/Historial/g, 'History'],
  [/Ubicación/g, 'Location'],
  [/Disponibilidad/g, 'Availability'],
  [/Total/g, 'Total'],
  [/Método/g, 'Method'],
  [/Destino/g, 'Destination'],
  [/Área/g, 'Area'],
  [/Zona/g, 'Zone'],
  [/Calle/g, 'Street'],
  [/Avenida/g, 'Avenue'],
  
  // Adjectives & States
  [/Confirmada/g, 'Confirmed'],
  [/Activa/g, 'Active'],
  [/Pasada/g, 'Past'],
  [/Próxima/g, 'Upcoming'],
  [/Exitosa/g, 'Successful'],
  [/Exitoso/g, 'Successful'],
  [/Disponible/g, 'Available'],
  [/Ocupado/g, 'Occupied'],
  [/Gratis/g, 'Free'],
  [/Nuevo/g, 'New'],
  [/Nueva/g, 'New'],
  [/Popular/g, 'Popular'],
  
  // Phrases
  [/para otra person/g, 'for another person'],
  [/Bienvenido/g, 'Welcome'],
  [/Inicia sesión/g, 'Login'],
  [/Cerrar sesión/g, 'Logout'],
  [/No tienes/g, "You don't have"],
  [/ninguna/g, 'any'],
  [/aquí/g, 'here'],
  [/dentro de/g, 'within'],
  [/fuera de/g, 'outside of'],
  [/hace/g, 'ago'],
  [/ahora/g, 'now'],
  [/hoy/g, 'today'],
  [/mañana/g, 'tomorrow']
];

// Apply replacements
dict.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

// Final cleanup: Remove ALL empty lines to make it compact
let lines = content.split('\n').map(l => l.trimEnd());
let cleanedLines = lines.filter(l => l !== '');

fs.writeFileSync(targetFile, cleanedLines.join('\n'));
console.log('Final Polish: Full translation and code compaction successful.');
