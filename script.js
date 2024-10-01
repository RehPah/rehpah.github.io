let cars = JSON.parse(localStorage.getItem('cars')) || [];

function saveCars() {
    localStorage.setItem('cars', JSON.stringify(cars));
}

function addCar(event) {
    event.preventDefault();
    const name = document.getElementById('carName').value;
    const plate = document.getElementById('carPlate').value;
    const fined = document.getElementById('carFined').checked;

    if (!validatePlate(plate)) {
        alert('Placa inválida. Use o formato ABC-1234.');
        return;
    }

    cars.push({ name, plate, fined });
    saveCars();
    renderCars();
    updateStats();
    event.target.reset();
}

function deleteCar(index) {
    if (confirm('Tem certeza que deseja excluir este carro?')) {
        cars.splice(index, 1);
        saveCars();
        renderCars();
        updateStats();
    }
}

function renderCars(filteredCars = cars) {
    const carList = document.getElementById('carList');
    carList.innerHTML = '';

    filteredCars.forEach((car, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${car.name}</td>
            <td>${car.plate}</td>
            <td>${car.fined ? 'Multado' : 'Não Multado'}</td>
            <td><button class="delete-btn" onclick="deleteCar(${index})">Excluir</button></td>
        `;
        carList.appendChild(row);
    });
}

function validatePlate(plate) {
    const plateRegex = /^[A-Z]{3}-\d{4}$/;
    return plateRegex.test(plate);
}

function updateStats() {
    document.getElementById('totalCars').textContent = cars.length;
    document.getElementById('finedCars').textContent = cars.filter(car => car.fined).length;
}

function searchCars() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredCars = cars.filter(car => 
        car.name.toLowerCase().includes(searchTerm) || 
        car.plate.toLowerCase().includes(searchTerm)
    );
    renderCars(filteredCars);
}

document.getElementById('carForm').addEventListener('submit', addCar);
document.getElementById('searchInput').addEventListener('input', searchCars);

renderCars();
updateStats();