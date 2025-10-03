import * as bcrypt from 'bcrypt';

export const comparePasswords = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      hashedPassword,
    );
    return isPasswordValid;
  } catch (error) {
    throw new Error('Internal server error');
    console.log(error);
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword: string = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Internal server error');
    console.log(error);
  }
};
