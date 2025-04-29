const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs/promises');
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
        const id = uuidv4();
        testData.set(id, {
            id,
            name: `Item-${i}`,
            position: i,
            selected: false
        });
    }
    return testData;
};
let sortedOrder = {};

async function loadSortedOrder() {
    try {
        const fileData = await fs.readFile(sortedOrderFile, 'utf-8');
        sortedOrder = new Map(JSON.parse(fileData));
    } catch (err) {
        console.log('Файл не найден или повреждён, генерируем новый...');
        sortedOrder = generateTestData();
    }
}

async function saveSortedOrder() {
    await fs.writeFile(sortedOrderFile, JSON.stringify(Array.from(sortedOrder.entries()), null, 2));
    console.log('Данные успешно сохранены');
}

// Загрузить при старте
loadSortedOrder();

// ============ API маршруты ============
app.get('/items', (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;

    let itemsArray = Array.from(sortedOrder.values());
    if (search) {
        itemsArray = itemsArray.filter(item =>
            item.name.toLowerCase().includes(search)
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

app.post('/batchSave', async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid format, expected items array' });
    }

    try {
        items.forEach(({ id, position, selected }) => {
            const item = sortedOrder.get(id);
            if (item) {
                item.position = position;
                item.selected = selected;
                sortedOrder.set(id, item);
            }
        });

        await saveSortedOrder();
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при сохранении:', err);
        res.status(500).json({ error: 'Ошибка сервера при сохранении' });
    }
});

// ============ Отдача фронтенда ============
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// ============ Запуск сервера ============
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
