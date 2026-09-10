export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 
    ? 'Ocurrió un error interno en el servidor.' 
    : err.message;

  // En entorno de desarrollo puedes ver el error real en tu consola:
  if (statusCode === 500) {
    console.error('Error 500 detectado:', err);
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    error: message,
  });
};