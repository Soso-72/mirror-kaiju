import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const pepper = process.env.PEPPER;

    try {
        const passwordWithPepper = password + pepper;
        const isMatch = await bcrypt.compare(passwordWithPepper, hashedPassword);
        return isMatch;

    } catch (error) {
        console.error("Error verifying password:", error);
        throw new Error("Failed to verify password");
    }
}   