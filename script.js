// Preencha estes valores com as credenciais públicas do seu projeto Supabase.
const SUPABASE_CONFIG = { url: 'https://daozrnvwxdlncllbufru.supabase.co', anonKey: 'sb_publishable_TaPc5ycAScv_AMqCHSV47A_8_MfP2G_' };
const STORAGE_KEY = 'controle-de-alunos-records';
let supabaseClient = null;
let students = [];
let editingId = null;
let sortState = { key: 'name', direction: 'asc' };

const $ = (selector) => document.querySelector(selector);
const formatCPF = (value) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '--/--/----';
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
function setConnection(online) { $('#connectionDot').classList.toggle('online', online); $('#connectionText').textContent = online ? 'Supabase conectado' : 'Modo local'; $('#setupNote').classList.toggle('show', !online); }

async function loadStudents() {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('students').select('*');
        if (error) { showToast('Não foi possível carregar o Supabase.'); console.error(error); return; }
        students = data || [];
    } else students = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    render();
}

async function saveStudent(record) {
    if (supabaseClient) {
        const { data, error } = editingId ? await supabaseClient.from('students').update(record).eq('id', editingId).select().single() : await supabaseClient.from('students').insert(record).select().single();
        if (error) throw error;
        if (editingId) students = students.map((student) => student.id === editingId ? data : student); else students.push(data);
    } else {
        if (editingId) students = students.map((student) => student.id === editingId ? { ...student, ...record } : student);
        else students.push({ ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    }
}

async function removeStudent(id) {
    if (supabaseClient) { const { error } = await supabaseClient.from('students').delete().eq('id', id); if (error) throw error; }
    students = students.filter((student) => student.id !== id);
    if (!supabaseClient) localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    render(); showToast('Cadastro excluído.');
}

function render() {
    const query = $('#searchInput').value.toLowerCase().trim();
    const filtered = students.filter((student) => `${student.name} ${student.cpf}`.toLowerCase().includes(query));
    filtered.sort((a, b) => { const valueA = a[sortState.key] || ''; const valueB = b[sortState.key] || ''; return String(valueA).localeCompare(String(valueB), 'pt-BR') * (sortState.direction === 'asc' ? 1 : -1); });
    $('#studentRows').innerHTML = filtered.length ? filtered.map((student) => `<tr><td><div class="student-name"><span class="avatar">${escapeHTML(initials(student.name))}</span>${escapeHTML(student.name)}</div></td><td class="cpf">${escapeHTML(student.cpf)}</td><td class="date">${formatDate(student.last_class)}</td><td class="date">${formatDate(student.last_test)}</td><td><div class="actions"><button class="icon-btn edit" data-id="${student.id}" title="Editar aluno" aria-label="Editar aluno"><i data-lucide="pencil" width="16"></i></button><button class="icon-btn delete" data-id="${student.id}" title="Excluir aluno" aria-label="Excluir aluno"><i data-lucide="trash-2" width="16"></i></button></div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty"><i data-lucide="users-round" width="29"></i><strong>Nenhum aluno encontrado</strong><span>Cadastre o primeiro aluno ou ajuste sua busca.</span></div></td></tr>';
    $('#totalCount').textContent = students.length;
    $('#testCount').textContent = students.filter((student) => student.last_test).length;
    const latest = [...students].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    $('#latestDate').textContent = latest?.created_at ? formatDate(latest.created_at.slice(0, 10)) : '--/--/----';
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
    const form = new FormData(event.target); const record = { name: form.get('name').trim(), cpf: formatCPF(form.get('cpf')), last_class: form.get('last_class'), last_test: form.get('last_test') || null };
    document.querySelectorAll('.field small').forEach((error) => error.textContent = '');
    if (record.name.length < 3) { $('#name').nextElementSibling.textContent = 'Informe o nome completo.'; return; }
    if (!isValidCPF(record.cpf)) { $('#cpf').nextElementSibling.textContent = 'Informe um CPF válido.'; return; }
    if (students.some((student) => student.cpf === record.cpf && student.id !== editingId)) { $('#cpf').nextElementSibling.textContent = 'Este CPF já está cadastrado.'; return; }
    $('#saveBtn').disabled = true;
    const wasEditing = Boolean(editingId);
    try { await saveStudent(record); closeModal(); render(); showToast(wasEditing ? 'Cadastro atualizado.' : 'Aluno cadastrado com sucesso.'); } catch (error) { showToast('Não foi possível salvar o cadastro.'); console.error(error); } finally { $('#saveBtn').disabled = false; }
});

if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) { supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey); setConnection(true); } else setConnection(false);
lucide.createIcons(); loadStudents();
