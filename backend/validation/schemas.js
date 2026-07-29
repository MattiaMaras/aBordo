const { z } = require('zod');

// Messaggi in italiano, coerenti con quelli mostrati dal frontend.

const nameField = (label) => z
  .string({ error: `${label} è obbligatorio` })
  .trim()
  .min(1, `${label} è obbligatorio`)
  .max(100, `${label} troppo lungo (max 100 caratteri)`);

const emailField = z
  .email({ error: 'Email non valida' })
  .trim()
  .toLowerCase()
  .max(255, 'Email troppo lunga (max 255 caratteri)');

const registerSchema = z.object({
  email: emailField,
  // bcrypt considera solo i primi 72 byte: oltre quel limite la password non aggiunge sicurezza
  password: z
    .string({ error: 'La password è obbligatoria' })
    .min(8, 'La password deve contenere almeno 8 caratteri')
    .max(72, 'La password non può superare 72 caratteri'),
  firstName: nameField('Il nome'),
  lastName: nameField('Il cognome'),
});

// Sul login non applichiamo il limite di 72: eventuali password legacy più lunghe
// vengono comunque confrontate correttamente (bcrypt tronca in modo consistente).
const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: 'La password è obbligatoria' })
    .min(1, 'La password è obbligatoria')
    .max(1024, 'Password troppo lunga'),
});

const profileUpdateSchema = z.object({
  firstName: nameField('Il nome'),
  lastName: nameField('Il cognome'),
  emailNotifications: z.boolean({ error: 'Valore non valido per le notifiche email' }).optional(),
});

const FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'methane'];

const vehicleCreateSchema = z.object({
  plateNumber: z
    .string({ error: 'La targa è obbligatoria' })
    .trim()
    .min(1, 'La targa è obbligatoria')
    .max(20, 'Targa non valida (max 20 caratteri)'),
  brand: nameField('La marca'),
  model: nameField('Il modello'),
  year: z
    .number({ error: 'Anno non valido' })
    .int('Anno non valido')
    .refine((y) => y >= 1900 && y <= new Date().getFullYear() + 1, 'Anno non valido'),
  currentMileage: z
    .number({ error: 'Chilometraggio non valido' })
    .int('Chilometraggio non valido')
    .min(0, 'Il chilometraggio non può essere negativo'),
  fuelType: z.enum(FUEL_TYPES, { error: 'Tipo di carburante non valido' }),
});

const vehicleUpdateSchema = vehicleCreateSchema.partial();

// Middleware di validazione: sostituisce req.body con i dati validati/normalizzati
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || [];
    return res.status(400).json({
      error: issues[0]?.message || 'Dati non validi',
      details: issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.body = result.data;
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
  FUEL_TYPES,
};
