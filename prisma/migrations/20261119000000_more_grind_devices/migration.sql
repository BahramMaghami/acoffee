-- Extend the existing enum without changing historical cart or order items.
ALTER TYPE "GrindDevice" ADD VALUE IF NOT EXISTS 'V60_AEROPRESS';
ALTER TYPE "GrindDevice" ADD VALUE IF NOT EXISTS 'FRENCH_PRESS';
ALTER TYPE "GrindDevice" ADD VALUE IF NOT EXISTS 'CHEMEX_CLEVER';
