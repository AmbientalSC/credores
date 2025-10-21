// Script para criar dados de exemplo para usuários
// Execute este script no console do navegador na página do Firebase

const userData = [
    {
        name: "João Silva",
        email: "joao.silva@exemplo.com",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        createdBy: "admin@exemplo.com"
    },
    {
        name: "Maria Santos",
        email: "maria.santos@exemplo.com",
        role: "user",
        status: "active",
        createdAt: new Date(),
        createdBy: "admin@exemplo.com"
    },
    {
        name: "Pedro Costa",
        email: "pedro.costa@exemplo.com",
        role: "viewer",
        status: "inactive",
        createdAt: new Date(),
        createdBy: "admin@exemplo.com"
    }
];

// Para adicionar ao Firestore, use este código no console do Firebase:
// userData.forEach(async (user) => {
//   await db.collection('users').add(user);
// });