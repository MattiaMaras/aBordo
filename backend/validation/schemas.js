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

const dateOnlyField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida (formato AAAA-MM-GG)');

// Stringa opzionale: null/stringa vuota vengono normalizzati a null (campo "vuoto"),
// così un edit può cancellare esplicitamente un valore precedente.
const optionalTextField = (maxLen) => z
  .string()
  .trim()
  .max(maxLen, `Testo troppo lungo (max ${maxLen} caratteri)`)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const optionalNonNegativeInt = z
  .number()
  .int('Deve essere un numero intero')
  .min(0, 'Non può essere negativo')
  .max(10_000_000, 'Valore troppo grande')
  .nullable()
  .optional();

const optionalNonNegativeAmount = z
  .number()
  .min(0, 'Non può essere negativo')
  .max(1_000_000, 'Valore troppo grande')
  .nullable()
  .optional();

// Validazione strutturale (formati/lunghezze); la mappa tipo-UI → tipo-DB e il
// controllo di duplicati restano nella route, dove serve accesso al DB.
const maintenanceCreateSchema = z.object({
  type: z
    .string({ error: 'Il tipo di manutenzione è obbligatorio' })
    .trim()
    .min(1, 'Il tipo di manutenzione è obbligatorio')
    .max(30, 'Tipo manutenzione non valido'),
  title: optionalTextField(255),
  description: optionalTextField(2000),
  location: optionalTextField(255),
  notes: optionalTextField(2000),
  lastMaintenance: dateOnlyField,
  lastMileage: optionalNonNegativeInt,
  nextMaintenance: dateOnlyField.nullable().optional(),
  nextMileage: optionalNonNegativeInt,
  cost: optionalNonNegativeAmount,
});

const maintenanceUpdateSchema = maintenanceCreateSchema.partial().extend({
  clearNextMaintenance: z.boolean().optional(),
  clearNextMileage: z.boolean().optional(),
});

// Onboarding veicolo: crea in un'unica transazione veicolo + ultimo dato noto di
// tutti gli interventi periodici, così le notifiche funzionano fin dal primo giorno.
const optionalLastDone = z.object({
  lastDate: dateOnlyField,
  lastMileage: optionalNonNegativeInt,
});

const onboardingSchema = z.object({
  vehicle: vehicleCreateSchema,
  insurance: z.object({
    company: nameField('La compagnia assicurativa'),
    expiryDate: dateOnlyField,
    annualPremium: optionalNonNegativeAmount,
  }),
  tax: z.object({
    region: nameField('La regione'),
    expiryDate: dateOnlyField,
    amount: optionalNonNegativeAmount,
  }),
  inspection: z.object({
    lastInspectionDate: dateOnlyField,
    inspectionCenter: optionalTextField(200),
  }),
  service: z.object({
    lastServiceDate: dateOnlyField,
    lastServiceMileage: z.number().int().min(0).max(10_000_000),
    serviceInterval: z.number().int().min(1000).max(100_000).optional(),
  }),
  tires: z.object({ lastDate: dateOnlyField }),
  filters: z.object({ lastDate: dateOnlyField }),
  extras: z.object({
    oilChange: optionalLastDone.optional(),
    brakes: optionalLastDone.optional(),
    belts: optionalLastDone.optional(),
    // AdBlue: a chilometri (consumo variabile), quindi i km dell'ultimo rabbocco sono obbligatori
    adblue: z.object({ lastDate: dateOnlyField, lastMileage: z.number().int().min(0).max(10_000_000) }).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.service.lastServiceMileage > data.vehicle.currentMileage) {
    ctx.addIssue({
      code: 'custom',
      path: ['service', 'lastServiceMileage'],
      message: 'I km dell\'ultimo tagliando non possono superare i km attuali del veicolo',
    });
  }
  if (data.extras?.adblue && data.extras.adblue.lastMileage > data.vehicle.currentMileage) {
    ctx.addIssue({
      code: 'custom',
      path: ['extras', 'adblue', 'lastMileage'],
      message: 'I km dell\'ultimo rabbocco AdBlue non possono superare i km attuali',
    });
  }
});

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
  maintenanceCreateSchema,
  maintenanceUpdateSchema,
  onboardingSchema,
  FUEL_TYPES,
};
