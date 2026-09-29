// Verifica se o utilizador está logado. Se não estiver, envia para a página de login
const token = localStorage.getItem("token")
if (!token) {
    window.location.href = "login.html"
}

// Converte data no formato AAAA-MM-DD (usado internamente) para DD/MM/AAAA (formato brasileiro)
function formatDateBR(isoDate) {
    if (!isoDate) return isoDate
    const parts = isoDate.split("-")
    if (parts.length !== 3) return isoDate
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
}

function formatPriceBR(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const logoutBtn = document.getElementById("logout-btn")
if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        localStorage.clear()
        window.location.href = "login.html"
    })
}

// Monta e exibe o link de agendamento público desse estabelecimento
const shareLinkInput = document.getElementById("share-link-input")
const copyLinkBtn = document.getElementById("copy-link-btn")
if (shareLinkInput) {
    const slug = localStorage.getItem("slug")
    const customerPageUrl = window.location.href.replace(/admin\.html.*$/, "customer.html")
    shareLinkInput.value = slug ? `${customerPageUrl}?slug=${slug}` : "Link indisponível — faça login novamente."
}
if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", function() {
        shareLinkInput.select()
        navigator.clipboard.writeText(shareLinkInput.value)
            .then(() => showToast("Link copiado!"))
            .catch(() => showToast("Não foi possível copiar. Copie manualmente.", true))
    })
}

const clientsList = document.getElementById("clients-list")
const appointmentsList = document.getElementById("appointments-list")
const totalClients = document.getElementById("total-clients")
const totalAppointments = document.getElementById("total-appointments")
const searchClient = document.getElementById("search-client")
const searchAppointment = document.getElementById("search-appointment")
const clientsTitle = document.getElementById("clients-title")
const appointmentsTitle = document.getElementById("appointments-title")

let clients = []

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
    }
}

function loadClients() {
    fetch(`${API_URL}/clients`, { headers: getAuthHeaders() })
    .then(response => {
        if (response.status === 401) {
            localStorage.clear()
            window.location.href = "login.html"
            return
        }
        return response.json()
    })
    .then(data => {
        if (!data) return
        clients = data
        clientsTitle.innerText = `Clientes (${data.length})`
        totalClients.innerText = data.length
        clientsList.innerHTML = ""

        data.forEach(function(client) {
            const search = searchClient ? searchClient.value.toLowerCase() : ""
            if (!client.name.toLowerCase().includes(search)) return

            const clientCard = document.createElement("div")
            const deleteButton = document.createElement("button")
            deleteButton.innerText = "🗑"
            clientCard.classList.add("client-card")

            const info = document.createElement("div")
            info.classList.add("card-info")
            const nameEl = document.createElement("h3")
            nameEl.textContent = `👤 ${client.name}`
            const phoneEl = document.createElement("p")
            phoneEl.textContent = `📞 ${client.phone}`
            info.appendChild(nameEl)
            info.appendChild(phoneEl)
            clientCard.appendChild(info)
            clientCard.appendChild(deleteButton)
            clientsList.appendChild(clientCard)

            deleteButton.addEventListener("click", function() {
                if (!confirm("Deseja realmente excluir este cliente?")) return
                fetch(`${API_URL}/client/${client.id}`, { method: "DELETE", headers: getAuthHeaders() })
                .then(response => response.json())
                .then(() => loadClients())
                .catch(error => console.error(error))
            })
        })

        loadAppointments()
    })
    .catch(error => console.error(error))
}

function loadAppointments() {
    fetch(`${API_URL}/appointments`, { headers: getAuthHeaders() })
    .then(response => response.json())
    .then(data => {
        if (!data) return
        appointmentsTitle.innerText = `Agendamentos (${data.length})`
        totalAppointments.innerText = data.length
        appointmentsList.innerHTML = ""

        data.forEach(function(appointment) {
            const clientName = appointment.client_name || "Cliente"

            const search = searchAppointment ? searchAppointment.value.toLowerCase() : ""
            if (!clientName.toLowerCase().includes(search)) return

            const appointmentCard = document.createElement("div")
            const deleteButton = document.createElement("button")
            deleteButton.innerText = "🗑"
            appointmentCard.classList.add("client-card")

            const info = document.createElement("div")
            info.classList.add("card-info")

            const nameEl = document.createElement("h3")
            nameEl.textContent = `📅 ${clientName}`
            const dateEl = document.createElement("p")
            dateEl.textContent = `🗓 ${formatDateBR(appointment.date)}`
            const timeEl = document.createElement("p")
            timeEl.textContent = `🕒 ${appointment.time}`

            info.appendChild(nameEl)
            info.appendChild(dateEl)
            info.appendChild(timeEl)

            if (appointment.service_name) {
                const serviceEl = document.createElement("p")
                serviceEl.textContent = `✂️ ${appointment.service_name} — ${formatPriceBR(appointment.service_price)}`
                info.appendChild(serviceEl)
            }

            appointmentCard.appendChild(info)

            const actions = document.createElement("div")
            actions.style.display = "flex"
            actions.style.gap = "6px"

            const editButton = document.createElement("button")
            editButton.innerText = "✏️"
            editButton.title = "Remarcar"
            editButton.addEventListener("click", function() {
                openRescheduleForm(appointment)
            })

            actions.appendChild(editButton)
            actions.appendChild(deleteButton)
            appointmentCard.appendChild(actions)

            deleteButton.addEventListener("click", function() {
                if (!confirm("Deseja realmente excluir este agendamento?")) return
                fetch(`${API_URL}/appointment/${appointment.id}`, { method: "DELETE", headers: getAuthHeaders() })
                .then(response => response.json())
                .then(() => loadAppointments())
                .catch(error => console.error(error))
            })

            appointmentsList.appendChild(appointmentCard)
        })
    })
    .catch(error => console.error(error))
}

// --- REMARCAR AGENDAMENTO ---
function openRescheduleForm(appointment) {
    const newDate = prompt("Nova data (AAAA-MM-DD):", appointment.date)
    if (!newDate) return
    const newTime = prompt("Novo horário (HH:MM):", appointment.time)
    if (!newTime) return

    fetch(`${API_URL}/appointment/${appointment.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date: newDate, time: newTime })
    })
    .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || "Erro ao remarcar")
        return data
    })
    .then(data => {
        showToast(data.message)
        loadAppointments()
    })
    .catch(error => showToast(error.message, true))
}

loadClients()

if (searchClient) {
    searchClient.addEventListener("input", () => loadClients())
}
if (searchAppointment) {
    searchAppointment.addEventListener("input", () => loadAppointments())
}

// --- ABAS ---
const tabBtnOverview = document.getElementById("tab-btn-overview")
const tabBtnServices = document.getElementById("tab-btn-services")
const tabBtnSchedule = document.getElementById("tab-btn-schedule")
const tabOverview = document.getElementById("tab-overview")
const tabServices = document.getElementById("tab-services")
const tabSchedule = document.getElementById("tab-schedule")

function activateTab(activeBtn, activeContent) {
    const allBtns = [tabBtnOverview, tabBtnServices, tabBtnSchedule]
    const allContents = [tabOverview, tabServices, tabSchedule]
    allBtns.forEach(btn => btn.classList.remove("active"))
    allContents.forEach(el => el.style.display = "none")
    activeBtn.classList.add("active")
    activeContent.style.display = "block"
}

if (tabBtnOverview && tabBtnServices && tabBtnSchedule) {
    tabBtnOverview.addEventListener("click", () => activateTab(tabBtnOverview, tabOverview))

    tabBtnServices.addEventListener("click", () => {
        activateTab(tabBtnServices, tabServices)
        loadServicesAdmin()
    })

    tabBtnSchedule.addEventListener("click", () => {
        activateTab(tabBtnSchedule, tabSchedule)
        loadSchedule()
        loadBlockedSlots()
    })
}

// --- SERVIÇOS ---
const serviceNameInput = document.getElementById("service-name")
const servicePriceInput = document.getElementById("service-price")
const serviceDurationInput = document.getElementById("service-duration")
const saveServiceBtn = document.getElementById("save-service-btn")
const servicesListAdmin = document.getElementById("services-list-admin")

function loadServicesAdmin() {
    if (!servicesListAdmin) return

    fetch(`${API_URL}/services`, { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(services => {
        servicesListAdmin.innerHTML = ""

        if (services.length === 0) {
            servicesListAdmin.innerHTML = "<p class='section-description'>Nenhum serviço cadastrado ainda.</p>"
            return
        }

        services.forEach(service => {
            const card = document.createElement("div")
            card.classList.add("service-card")

            const info = document.createElement("div")
            const nameEl = document.createElement("h3")
            nameEl.textContent = service.name
            const metaEl = document.createElement("p")
            metaEl.classList.add("service-meta")
            metaEl.textContent = `${service.duration_minutes} min`
            info.appendChild(nameEl)
            info.appendChild(metaEl)

            const actions = document.createElement("div")
            actions.classList.add("service-actions")

            const price = document.createElement("span")
            price.classList.add("price-tag")
            price.textContent = formatPriceBR(service.price)

            const deleteBtn = document.createElement("button")
            deleteBtn.classList.add("btn-secondary")
            deleteBtn.type = "button"
            deleteBtn.innerText = "Remover"
            deleteBtn.addEventListener("click", function() {
                if (!confirm("Deseja realmente remover este serviço?")) return
                fetch(`${API_URL}/services/${service.id}`, { method: "DELETE", headers: getAuthHeaders() })
                .then(() => loadServicesAdmin())
                .catch(error => console.error(error))
            })

            actions.appendChild(price)
            actions.appendChild(deleteBtn)

            card.appendChild(info)
            card.appendChild(actions)
            servicesListAdmin.appendChild(card)
        })
    })
    .catch(error => console.error(error))
}

if (saveServiceBtn) {
    saveServiceBtn.addEventListener("click", function() {
        const name = serviceNameInput.value.trim()
        const price = parseFloat(servicePriceInput.value)
        const duration = parseInt(serviceDurationInput.value)

        if (!name) {
            showToast("Digite o nome do serviço.", true)
            return
        }
        if (isNaN(price) || price < 0) {
            showToast("Digite um preço válido.", true)
            return
        }
        if (isNaN(duration) || duration < 5) {
            showToast("Digite uma duração válida (mínimo 5 minutos).", true)
            return
        }

        fetch(`${API_URL}/services`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, price, duration_minutes: duration })
        })
        .then(async response => {
            const data = await response.json()
            if (!response.ok) throw new Error(data.detail || "Erro ao cadastrar serviço")
            return data
        })
        .then(data => {
            showToast(data.message)
            serviceNameInput.value = ""
            servicePriceInput.value = ""
            serviceDurationInput.value = ""
            loadServicesAdmin()
        })
        .catch(error => showToast(error.message, true))
    })
}

// --- HORÁRIO DE ATENDIMENTO ---
const startTimeInput = document.getElementById("schedule-start-time")
const endTimeInput = document.getElementById("schedule-end-time")
const durationSelect = document.getElementById("schedule-duration")
const capacityInput = document.getElementById("schedule-capacity")
const saveScheduleBtn = document.getElementById("save-schedule-btn")

function loadSchedule() {
    fetch(`${API_URL}/schedule`, { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(data => {
        const activeDays = data.working_days.split(",")
        document.querySelectorAll("#working-days-picker input[type=checkbox]").forEach(cb => {
            cb.checked = activeDays.includes(cb.value)
        })
        startTimeInput.value = data.start_time
        endTimeInput.value = data.end_time
        if (durationSelect && data.slot_duration_minutes) {
            durationSelect.value = String(data.slot_duration_minutes)
        }
        if (capacityInput && data.capacity) {
            capacityInput.value = data.capacity
        }
    })
    .catch(error => console.error(error))
}

if (saveScheduleBtn) {
    saveScheduleBtn.addEventListener("click", function() {
        const checked = Array.from(document.querySelectorAll("#working-days-picker input[type=checkbox]:checked"))
            .map(cb => cb.value)

        if (checked.length === 0) {
            showToast("Selecione pelo menos um dia de atendimento.", true)
            return
        }
        if (!startTimeInput.value || !endTimeInput.value) {
            showToast("Preencha o horário de início e fim.", true)
            return
        }

        fetch(`${API_URL}/schedule`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                working_days: checked.join(","),
                start_time: startTimeInput.value,
                end_time: endTimeInput.value,
                slot_duration_minutes: parseInt(durationSelect ? durationSelect.value : "60"),
                capacity: parseInt(capacityInput ? capacityInput.value : "1")
            })
        })
        .then(async response => {
            const data = await response.json()
            if (!response.ok) throw new Error(data.detail || "Erro ao salvar horário")
            return data
        })
        .then(data => showToast(data.message))
        .catch(error => showToast(error.message, true))
    })
}

// --- BLOQUEIO DE DIAS E HORÁRIOS ---
const blockDateInput = document.getElementById("block-date")
const blockTimeInput = document.getElementById("block-time")
const blockReasonInput = document.getElementById("block-reason")
const createBlockBtn = document.getElementById("create-block-btn")
const blockedSlotsList = document.getElementById("blocked-slots-list")

function loadBlockedSlots() {
    if (!blockedSlotsList) return

    fetch(`${API_URL}/blocked-slots`, { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(slots => {
        blockedSlotsList.innerHTML = ""

        if (slots.length === 0) {
            blockedSlotsList.innerHTML = "<p class='section-description'>Nenhum bloqueio ativo.</p>"
            return
        }

        slots.forEach(slot => {
            const item = document.createElement("div")
            item.classList.add("blocked-slot-item")

            const info = document.createElement("div")
            const title = document.createElement("strong")
            title.innerText = slot.time ? `${formatDateBR(slot.date)} às ${slot.time}` : `${formatDateBR(slot.date)} (dia inteiro)`
            const reason = document.createElement("p")
            reason.style.margin = "4px 0 0"
            reason.style.color = "var(--muted)"
            reason.style.fontSize = "13px"
            reason.innerText = slot.reason || "Sem motivo informado"

            info.appendChild(title)
            info.appendChild(reason)

            const deleteBtn = document.createElement("button")
            deleteBtn.classList.add("btn-secondary")
            deleteBtn.type = "button"
            deleteBtn.innerText = "Remover"
            deleteBtn.addEventListener("click", function() {
                fetch(`${API_URL}/blocked-slots/${slot.id}`, { method: "DELETE", headers: getAuthHeaders() })
                .then(() => loadBlockedSlots())
                .catch(error => console.error(error))
            })

            item.appendChild(info)
            item.appendChild(deleteBtn)
            blockedSlotsList.appendChild(item)
        })
    })
    .catch(error => console.error(error))
}

if (createBlockBtn) {
    createBlockBtn.addEventListener("click", function() {
        if (!blockDateInput.value) {
            showToast("Escolha uma data para bloquear.", true)
            return
        }

        fetch(`${API_URL}/blocked-slots`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                date: blockDateInput.value,
                time: blockTimeInput.value || null,
                reason: blockReasonInput.value.trim() || null
            })
        })
        .then(async response => {
            const data = await response.json()
            if (!response.ok) throw new Error(data.detail || "Erro ao bloquear")
            return data
        })
        .then(data => {
            showToast(data.message)
            blockDateInput.value = ""
            blockTimeInput.value = ""
            blockReasonInput.value = ""
            loadBlockedSlots()
        })
        .catch(error => showToast(error.message, true))
    })
}
