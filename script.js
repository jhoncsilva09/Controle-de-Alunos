const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2LF23-xbhuOhSc-zmkSTHUB5IhLkkNLs",
    authDomain: "controle-de-alunos-b1bc7.firebaseapp.com",
    projectId: "controle-de-alunos-b1bc7",
    storageBucket: "controle-de-alunos-b1bc7.firebasestorage.app",
    messagingSenderId: "841074319963",
    appId: "1:841074319963:web:e2e02dda91f08a4806d57e"
};
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const studentsCollection = db.collection('students');
let students = [];
let editingId = null;
let sortState = { key: 'name', direction: 'asc' };

const $ = (selector) => document.querySelector(selector);
const formatCPF = (value) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '--/--/----';
const formatCreatedDate = (value) => {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '--/--/----' : date.toLocaleDateString('pt-BR');
};
const initials = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function isValidCPF(value) {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let sum = 0;
    for (let index = 0; index < 9; index++) sum += Number(cpf[index]) * (10 - index);
    let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;
    sum = 0;
    for (let index = 0; index < 10; index++) sum += Number(cpf[index]) * (11 - index);
    digit = (sum * 10) % 11; if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
function setConnection(online) { $('#connectionDot').classList.toggle('online', online); $('#connectionText').textContent = online ? 'Firebase conectado' : 'Aguardando login'; }

async function loadStudents() {
    const snapshot = await studentsCollection.get();
    students = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    render();
}

async function saveStudent(record) {
    if (editingId) {
        await studentsCollection.doc(editingId).update(record);
        students = students.map((student) => student.id === editingId ? { ...student, ...record } : student);
    } else {
        const document = await studentsCollection.add({
            ...record,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        const savedStudent = await document.get();
        students.push({ id: document.id, ...savedStudent.data() });
    }
}

async function removeStudent(id) {
    await studentsCollection.doc(id).delete();
    students = students.filter((student) => student.id !== id);
    render(); showToast('Cadastro excluído.');
}

function render() {
    const query = $('#searchInput').value.toLowerCase().trim();
    const filtered = students.filter((student) => `${student.name} ${student.cpf}`.toLowerCase().includes(query));
    filtered.sort((a, b) => { const valueA = a[sortState.key] || ''; const valueB = b[sortState.key] || ''; return String(valueA).localeCompare(String(valueB), 'pt-BR') * (sortState.direction === 'asc' ? 1 : -1); });
    $('#studentRows').innerHTML = filtered.length ? filtered.map((student) => `<tr><td><div class="student-name"><span class="avatar">${escapeHTML(initials(student.name))}</span>${escapeHTML(student.name)}</div></td><td class="cpf">${escapeHTML(student.cpf)}</td><td class="date">${formatDate(student.last_class)}</td><td class="date">${formatDate(student.last_test)}</td><td><div class="actions"><button class="icon-btn edit" data-id="${student.id}" title="Editar aluno" aria-label="Editar aluno"><i data-lucide="pencil" width="16"></i></button><button class="icon-btn delete" data-id="${student.id}" title="Excluir aluno" aria-label="Excluir aluno"><i data-lucide="trash-2" width="16"></i></button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty"><i data-lucide="users-round" width="29"></i><strong>Nenhum aluno encontrado</strong><span>Cadastre o primeiro aluno ou ajuste sua busca.</span></div></td></tr>';
    $('#totalCount').textContent = students.length;
    $('#testCount').textContent = students.filter((student) => student.last_test).length;
    const latest = [...students].sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at || 0).getTime();
        const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at || 0).getTime();
        return dateB - dateA;
    })[0];
    $('#latestDate').textContent = latest?.created_at ? formatCreatedDate(latest.created_at) : '--/--/----';
    lucide.createIcons();
}

function openModal(student = null) { editingId = student?.id || null; $('#modalTitle').textContent = student ? 'Editar aluno' : 'Novo aluno'; $('#studentForm').reset(); if (student) { $('#name').value = student.name; $('#cpf').value = student.cpf; $('#lastClass').value = student.last_class; $('#lastTest').value = student.last_test || ''; } $('#modalBackdrop').classList.add('open'); setTimeout(() => $('#name').focus(), 50); }
function closeModal() { $('#modalBackdrop').classList.remove('open'); editingId = null; }

$('#cpf').addEventListener('input', (event) => { event.target.value = formatCPF(event.target.value); });
$('#searchInput').addEventListener('input', render);
$('#newStudentBtn').addEventListener('click', () => openModal());
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
$('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) closeModal(); });
document.querySelectorAll('.sort-btn').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.sort; sortState = { key, direction: sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc' }; render(); }));
$('#studentRows').addEventListener('click', async (event) => { const button = event.target.closest('button'); if (!button) return; const student = students.find((item) => item.id === button.dataset.id); if (button.classList.contains('edit')) openModal(student); if (button.classList.contains('delete') && student && confirm(`Excluir o cadastro de ${student.name}?`)) { try { await removeStudent(student.id); } catch (error) { showToast('Não foi possível excluir o cadastro.'); } } });
$('#studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target); const record = { name: form.get('name').trim(), cpf: formatCPF(form.get('cpf')), last_class: form.get('last_class') || null, last_test: form.get('last_test') || null };
    document.querySelectorAll('.field small').forEach((error) => error.textContent = '');
    if (record.name.length < 3) { $('#name').nextElementSibling.textContent = 'Informe o nome completo.'; return; }
    if (!isValidCPF(record.cpf)) { $('#cpf').nextElementSibling.textContent = 'Informe um CPF válido.'; return; }
    if (students.some((student) => student.cpf === record.cpf && student.id !== editingId)) { $('#cpf').nextElementSibling.textContent = 'Este CPF já está cadastrado.'; return; }
    $('#saveBtn').disabled = true;
    const wasEditing = Boolean(editingId);
    try { await saveStudent(record); closeModal(); render(); showToast(wasEditing ? 'Cadastro atualizado.' : 'Aluno cadastrado com sucesso.'); } catch (error) { showToast('Não foi possível salvar o cadastro.'); console.error(error); } finally { $('#saveBtn').disabled = false; }
});

$('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('#loginError').textContent = '';
    $('#loginBtn').disabled = true;
    const form = new FormData(event.currentTarget);
    try {
        await auth.signInWithEmailAndPassword(form.get('email').trim(), form.get('password'));
    } catch (error) {
        console.error(error);
        $('#loginError').textContent = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found'
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível entrar. Verifique o e-mail, a senha e a configuração do Firebase.';
    } finally {
        $('#loginBtn').disabled = false;
    }
});

$('#signOutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error(error);
        showToast('Não foi possível sair da conta.');
    }
});

auth.onAuthStateChanged(async (user) => {
    $('#loginScreen').hidden = Boolean(user);
    $('#appMain').hidden = !user;
    $('#signOutBtn').hidden = !user;
    setConnection(Boolean(user));
    if (!user) {
        students = [];
        return;
    }
    try {
        await loadStudents();
    } catch (error) {
        console.error(error);
        showToast('Não foi possível carregar os alunos. Verifique as regras de acesso do Firestore.');
    }
});

lucide.createIcons();
