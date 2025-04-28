import Table from './Table';

function App() {
    return (
        <div style={{margin: '20px'}}>
            <h1 style={{
                fontFamily: 'Poppins, Arial, sans-serif',
                fontSize: '32px',
                fontWeight: 700,
                color: '#333',
                marginBottom: '20px',
                textAlign: 'center',
                letterSpacing: '2px',
                textTransform: 'uppercase'
            }}>
                List of Elements
            </h1>
            <Table/>
        </div>
    );
}

export default App;
