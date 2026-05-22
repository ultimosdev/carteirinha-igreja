import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const membrosCollection = collection(db, "membros");

// Salva o membro diretamente no banco de dados gratuito (Firestore) junto com o Base64 da foto
export async function salvarMembro(membroInstance) {
    try {
        const docRef = await addDoc(membrosCollection, membroInstance.toFirestore());
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar no Firebase Firestore:", error);
        throw error;
    }
}

export async function listarMembros() {
    try {
        const querySnapshot = await getDocs(membrosCollection);
        const lista = [];
        querySnapshot.forEach((doc) => {
            lista.push({ id: doc.id, ...doc.data() });
        });
        return lista;
    } catch (error) {
        console.error("Erro ao listar membros:", error);
        throw error;
    }
}

export async function deletarMembro(id) {
    try {
        await deleteDoc(doc(db, "membros", id));
    } catch (error) {
        console.error("Erro ao deletar membro:", error);
        throw error;
    }
}
