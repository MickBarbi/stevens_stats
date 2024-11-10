// Import Prisma Client
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listValues() {
    try {
        const results = await prisma.athletes.findMany({
            select: {
                first_name: true, // Replace with your actual column name
            },
        });

        console.log(results); // Output the results to the console
        return results; // Return the results if needed
    } catch (error) {
        console.error('Error querying the database:', error);
    } finally {
        await prisma.$disconnect(); // Close the connection when done
    }
}

// Call the function
listValues();
