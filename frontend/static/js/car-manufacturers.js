// frontend/static/js/car-manufacturers.js
const carManufacturers = [
    { name: 'Audi', logo: 'audi.svg' },
    { name: 'BMW', logo: 'bmw.svg' },
    { name: 'Mercedes-Benz', logo: 'mercedes.svg' },
    { name: 'Volkswagen', logo: 'volkswagen.svg' },
    { name: 'Ford', logo: 'ford.svg' },
    { name: 'Opel', logo: 'opel.svg' },
    { name: 'Renault', logo: 'renault.svg' },
    { name: 'Peugeot', logo: 'peugeot.svg' },
    { name: 'Citroen', logo: 'citroen.svg' },
    { name: 'Fiat', logo: 'fiat.svg' },
    { name: 'Tesla', logo: 'tesla.svg' },
    { name: 'Toyota', logo: 'toyota.svg' },
    { name: 'Honda', logo: 'honda.svg' },
    { name: 'Hyundai', logo: 'hyundai.svg' },
    { name: 'Kia', logo: 'kia.svg' },
    { name: 'Mazda', logo: 'mazda.svg' },
    { name: 'Nissan', logo: 'nissan.svg' },
    { name: 'Seat', logo: 'seat.svg' },
    { name: 'Skoda', logo: 'skoda.svg' },
    { name: 'Volvo', logo: 'volvo.svg' }
];

function getManufacturerLogo(brand) {
    const manufacturer = carManufacturers.find(m => m.name.toLowerCase() === brand.toLowerCase());
    return manufacturer ? manufacturer.logo : '/assets/logo/default.svg';
}