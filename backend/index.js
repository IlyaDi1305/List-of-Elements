const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const sortedOrderFile = path.join(__dirname, 'sortedOrder.json');
const generateTestData = () => {
    const testData = new Map();
    for (let i = 1; i <= 1000000; i++) {
        testData.set(uuidv4(), {
            id: uuidv4(),
            name: `Item-${i}`,
            position: i,
            selected: false
        });
    }
    return testData;
};

let sortedOrder = fs.existsSync(sortedOrderFile)
    ? new Map(JSON.parse(fs.readFileSync(sortedOrderFile, 'utf-8')))
    : generateTestData();

let saveTimeout = null;

function saveSortedOrderDebounced() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        fs.writeFileSync(sortedOrderFile, JSON.stringify(Array.from(sortedOrder.entries())));
        console.log('sortedOrder saved!');
    }, 500);
}

function saveSortedOrder() {
    fs.writeFileSync(sortedOrderFile, JSON.stringify(Array.from(sortedOrder.entries())));
}

// ============ API маршруты ============
app.get('/items', (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;

    let itemsArray = Array.from(sortedOrder.values());
    if (search) {
        itemsArray = itemsArray.filter(item =>
            (item.firstName && item.firstName.toLowerCase().includes(search)) ||
            (item.lastName && item.lastName.toLowerCase().includes(search)) ||
            (item.name && item.name.toLowerCase().includes(search))
        );
    }

    itemsArray.sort((a, b) => a.position - b.position);

    const paginatedItems = itemsArray.slice(offset, offset + limit);

    const result = paginatedItems.map(item => ({
        id: item.id,
        name: item.name,
        position: item.position,
        selected: item.selected || false
    }));

    res.json({ items: result, total: itemsArray.length });
});

app.post('/select', (req, res) => {
    const { id, selected } = req.body;

    const item = sortedOrder.get(id);
    if (item) {
        item.selected = selected;
        sortedOrder.set(id, item);
        saveSortedOrderDebounced();
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Item not found' });
    }
});

app.post('/sort', (req, res) => {
    const { id1, id2 } = req.body;

    const itemsArray = Array.from(sortedOrder.values());

    const index1 = itemsArray.findIndex(item => item.id === id1);
    const index2 = itemsArray.findIndex(item => item.id === id2);

    if (index1 === -1 || index2 === -1) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }

    const temp = itemsArray[index1];
    itemsArray[index1] = itemsArray[index2];
    itemsArray[index2] = temp;

    itemsArray.forEach((item, idx) => {
        item.position = idx + 1;
    });

    sortedOrder = new Map(itemsArray.map(item => [item.id, item]));

    saveSortedOrder();

    res.json({ success: true });
});

// ============ Отдача фронтенда ============

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// ============ Запуск сервера ============

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
