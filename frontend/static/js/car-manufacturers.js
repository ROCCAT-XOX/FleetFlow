
// frontend/js/car-manufacturers.js

export const carManufacturers = [
    { name: 'Audi', logo: '/assets/logo/audi.svg' },
    { name: 'BMW', logo: '/assets/logo/bmw.svg' },
    { name: 'Mercedes-Benz', logo: '/assets/logo/mercedes.svg' },
    { name: 'Volkswagen', logo: '/assets/logo/volkswagen.svg' },
    { name: 'Porsche', logo: '/assets/logo/porsche.svg' },
    { name: 'Dacia', logo: '/assets/logo/dacia.svg' },
    { name: 'Ford', logo: '/assets/logo/ford.svg' },
    { name: 'Toyota', logo: '/assets/logo/toyota.svg' },
    { name: 'Honda', logo: '/assets/logo/honda.svg' },
    { name: 'Tesla', logo: '/assets/logo/tesla.svg' },
    { name: 'Volvo', logo: '/assets/logo/volvo.svg' },
    { name: 'Nissan', logo: '/assets/logo/nissan.svg' },
    { name: 'Hyundai', logo: '/assets/logo/hyundai.svg' },
    { name: 'Kia', logo: '/assets/logo/kia.svg' },
    { name: 'Peugeot', logo: '/assets/logo/peugeot.svg' },
    { name: 'Renault', logo: '/assets/logo/renault.svg' },
    { name: 'Skoda', logo: '/assets/logo/skoda.svg' },
    { name: 'Fiat', logo: '/assets/logo/fiat.svg' },
    { name: 'Opel', logo: '/assets/logo/opel.svg' },
    { name: 'Seat', logo: '/assets/logo/seat.svg' },
    { name: 'Mazda', logo: '/assets/logo/mazda.svg' }
];

export function getManufacturerLogo(brand) {
    const manufacturer = carManufacturers.find(m => m.name.toLowerCase() === brand.toLowerCase());
    return manufacturer ? manufacturer.logo : '/assets/logo/default.svg';
}
