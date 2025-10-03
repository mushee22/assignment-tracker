import { ValidationError } from 'class-validator';

export const transformValidationMessages = (errors: ValidationError[]) => {
  const transformedErrors = errors.map((error) => ({
    field: error.property,
    messages: Object.values(error.constraints || {}),
  }));

  return transformedErrors;
};
