-- Først, opprett en midlertidig kolonne for å lagre de gamle dataene
ALTER TABLE `Report` ADD COLUMN `old_details` TEXT;

-- Kopier eksisterende data til den midlertidige kolonnen
UPDATE `Report` SET `old_details` = `details`;

-- Fjern den gamle details-kolonnen
ALTER TABLE `Report` DROP COLUMN `details`;

-- Opprett den nye details-kolonnen som JSON med en standard verdi
ALTER TABLE `Report` ADD COLUMN `details` JSON DEFAULT (JSON_OBJECT(
    'measuredWeight', 0,
    'declaredPower', 0,
    'ratio', 0,
    'requiredRatio', 0,
    'carInfo', 'Kunne ikke lese bilinformasjon',
    'startNumber', 'Kunne ikke lese startnummer',
    'error', 'Data må konverteres'
));

-- Oppdater dataene til riktig format for eksisterende rader
UPDATE `Report` 
SET `details` = JSON_OBJECT(
    'measuredWeight', 0,
    'declaredPower', 0,
    'ratio', 0,
    'requiredRatio', 0,
    'carInfo', 'Kunne ikke lese bilinformasjon',
    'startNumber', 'Kunne ikke lese startnummer',
    'error', 'Data må konverteres'
)
WHERE `old_details` IS NOT NULL;

-- Fjern den midlertidige kolonnen
ALTER TABLE `Report` DROP COLUMN `old_details`; 