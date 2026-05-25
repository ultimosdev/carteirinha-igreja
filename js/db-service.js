import { db } from './firebase-config.js';
import { 
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLECAO = "membros";

export async function listarMembros() {
    try {
        const querySnapshot = await getDocs(collection(db, COLECAO));
        const lista = [];
        querySnapshot.forEach((doc) => {
            // Retorna o ID do documento do Firebase junto com os dados
            lista.push({ id: doc.id, ...doc.data() });
        });
        return lista;
    } catch (e) {
        console.error("Erro ao listar membros: ", e);
        return [];
    }
}

export async function salvarMembro(membro) {
    try {
        // Usa o método toFirestore que já existe no seu membro.js
        await addDoc(collection(db, COLECAO), membro.toFirestore());
        return true;
    } catch (e) {
        console.error("Erro ao salvar: ", e);
        throw e;
    }
}

export async function atualizarMembro(id, dadosMembro) {
    try {
        const docRef = doc(db, COLECAO, id);
        await updateDoc(docRef, dadosMembro);
        return true;
    } catch (e) {
        console.error("Erro ao atualizar: ", e);
        throw e;
    }
}

export async function deletarMembro(id) {
    try {
        await deleteDoc(doc(db, COLECAO, id));
        return true;
    } catch (e) {
        console.error("Erro ao deletar: ", e);
        throw e;
    }
}