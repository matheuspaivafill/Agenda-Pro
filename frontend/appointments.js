window.currentBusinessId = null
window.foundClientId = null
window.selectedServiceId = null

// Converte data no formato AAAA-MM-DD (usado internamente) para DD/MM/AAAA (formato brasileiro)
function formatDateBR(isoDate) {
    if (!isoDate) return isoDate
    const parts = isoDate.split("-")
    if (parts.length !== 3) return isoDate
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
}

function formatPriceBR(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const businessDisplayName = document.getElementById("business-display-name")
const switchBusinessBtn = document.getElementById("switch-business-btn")
const selectBusinessSection = document.getElementById("select-business-section")
const searchBusinessInput = document.getElementById("search-business-input")
const businessSearchStatus = document.getElementById("business-search-status")

const servicesSection = document.getElementById("services-section")
const servicesList = document.getElementById("services-list")
const datetimeStepTitle = document.getElementById("datetime-step-title")

const appointmentForm = document.getElementById("appointment-form")
const confirmPhone = document.getElementById("confirm-phone")
const clientFoundMsg = document.getElementById("client-found-msg")
const existingAppointmentsBox = document.getElementById("existing-appointments-box")
const appointmentDate = document.getElementById("appointment-date")
const timeSelect = document.getElementById("time-select")
const submitAppointmentBtn = document.getElementById("submit-appointment-btn")

function initBusinessContext() {
    const urlParams = new URLSearchParams(window.location.search)
    const slug = urlParams.get("slug")

    if (slug) {
        fetch(`${API_URL}/business/slug/${slug}`)
        .then(res => res.json())
        .then(data => {
            if (data.id) {
                setBusiness(data.id, data.name)
            } else {
                showBusinessSearch("Estabelecimento não encontrado.")
            }
        })
        .catch(() => showBusinessSearch("Erro ao carregar o estabelecimento."))
        return
    }

    const savedId = sessionStorage.getItem("selectedBusinessId")
    const savedName = sessionStorage.getItem("selectedBusinessName")
    if (savedId && savedName) {
        setBusiness(parseInt(savedId), savedName)
    } else {
        showBusinessSearch()
    }
}

function setBusiness(id, name) {
    window.currentBusinessId = id
    sessionStorage.setItem("selectedBusinessId", id)
    sessionStorage.setItem("selectedBusinessName", name)
    businessDisplayName.innerText = `Agendando em: ${name}`
    selectBusinessSection.style.display = "none"
    if (switchBusinessBtn) switchBusinessBtn.style.display = "inline-block"
    const submitClientBtn = document.getElementById("submit-client-btn")
    if (submitClientBtn) submitClientBtn.disabled = false
    loadServices()
}

function showBusinessSearch(message = "") {
    businessDisplayName.innerText = "Agendamento Online"
    selectBusinessSection.style.display = "block"
    if (switchBusinessBtn) switchBusinessBtn.style.display = "none"
    if (message) businessSearchStatus.innerText = message
}

if (switchBusinessBtn) {
    switchBusinessBtn.addEventListener("click", function() {
        sessionStorage.removeItem("selectedBusinessId")
        sessionStorage.removeItem("selectedBusinessName")
        window.currentBusinessId = null
        showBusinessSearch()
    })
}

if (searchBusinessInput) {
    searchBusinessInput.addEventListener("change", function() {
        const slug = searchBusinessInput.value.trim().toLowerCase().replace(/\s+/g, "-")
        if (!slug) return

        fetch(`${API_URL}/business/slug/${slug}`)
        .then(res => res.json())
        .then(data => {
            if (data.id) {
                setBusiness(data.id, data.name)
                businessSearchStatus.innerText = `Encontrado: ${data.name}`
            } else {
                businessSearchStatus.innerText = "Estabelecimento não encontrado."
            }
        })
        .catch(() => {
            businessSearchStatus.innerText = "Estabelecimento não encontrado."
        })
    })
}

// --- SERVIÇOS ---
function loadServices() {
    if (!window.currentBusinessId || !servicesList) return

    fetch(`${API_URL}/services/public/${window.currentBusinessId}`)
    .then(res => res.json())
    .then(services => {
        if (!services || services.length === 0) {
            servicesSection.style.display = "none"
            datetimeStepTitle.innerText = "2. Escolha a Data e Horário"
            return
        }

        servicesSection.style.display = "block"
        datetimeStepTitle.innerText = "3. Escolha a Data e Horário"
        servicesList.innerHTML = ""

        services.forEach(service => {
            const option = document.createElement("div")
            option.classList.add("service-option")

            const info = document.createElement("div")
            const nameEl = document.createElement("div")
            nameEl.classList.add("service-name")
            nameEl.innerText = service.name
            const durationEl = document.createElement("div")
            durationEl.classList.add("service-duration")
            durationEl.innerText = `${service.duration_minutes} min`
            info.appendChild(nameEl)
            info.appendChild(durationEl)

            const price = document.createElement("div")
            price.classList.add("price-tag")
            price.innerText = formatPriceBR(service.price)

            option.appendChild(info)
            option.appendChild(price)

            option.addEventListener("click", function() {
                document.querySelectorAll(".service-option").forEach(el => el.classList.remove("selected"))
                option.classList.add("selected")
                window.selectedServiceId = service.id
            })

            servicesList.appendChild(option)
        })
    })
    .catch(error => console.error(error))
}

// Busca o cliente pelo telefone digitado, e mostra lembrete de agendamentos futuros
let lookupTimeout = null
if (confirmPhone) {
    confirmPhone.addEventListener("input", function() {
        window.foundClientId = null
        clientFoundMsg.innerText = ""
        clientFoundMsg.style.color = ""
        if (existingAppointmentsBox) existingAppointmentsBox.style.display = "none"

        clearTimeout(lookupTimeout)
        const phone = confirmPhone.value.trim()
        if (!window.currentBusinessId || phone.replace(/\D/g, "").length < 8) return

        lookupTimeout = setTimeout(() => {
            fetch(`${API_URL}/client/lookup?business_id=${window.currentBusinessId}&phone=${encodeURIComponent(phone)}`)
            .then(async res => {
                const data = await res.json()
                if (!res.ok) throw new Error(data.detail || "Cadastro não encontrado")
                return data
            })
            .then(data => {
                window.foundClientId = data.client_id
                clientFoundMsg.innerText = `✓ Agendando para ${data.name}`
                clientFoundMsg.style.color = "var(--success)"

                fetch(`${API_URL}/client/appointments?business_id=${window.currentBusinessId}&phone=${encodeURIComponent(phone)}`)
                .then(res => res.json())
                .then(appointments => {
                    if (!existingAppointmentsBox) return
                    if (appointments.length === 0) {
                        existingAppointmentsBox.style.display = "none"
                        return
                    }
                    const items = appointments.map(a => `${formatDateBR(a.date)} às ${a.time}`).join(", ")
                    const label = appointments.length === 1 ? "Você já tem um agendamento marcado:" : "Você já tem agendamentos marcados:"
                    existingAppointmentsBox.innerText = `📅 ${label} ${items}`
                    existingAppointmentsBox.style.display = "block"
                })
                .catch(() => {
                    if (existingAppointmentsBox) existingAppointmentsBox.style.display = "none"
                })
            })
            .catch(error => {
                window.foundClientId = null
                clientFoundMsg.innerText = "Não encontramos esse telefone. Cadastre-se no passo 1 primeiro."
                clientFoundMsg.style.color = "var(--danger)"
                if (existingAppointmentsBox) existingAppointmentsBox.style.display = "none"
            })
        }, 500)
    })
}

appointmentDate.addEventListener("change", function() {
    if (!window.currentBusinessId || !appointmentDate.value) return

    fetch(`${API_URL}/available-times/${window.currentBusinessId}/${appointmentDate.value}`)
    .then(res => res.json())
    .then(times => {
        timeSelect.innerHTML = ""

        if (times.length === 0) {
            timeSelect.innerHTML = '<option value="">Sem horários disponíveis para esta data</option>'
            timeSelect.disabled = true
            submitAppointmentBtn.disabled = true
            return
        }

        timeSelect.innerHTML = '<option value="">Selecione um horário</option>'
        times.forEach(time => {
            const option = document.createElement("option")
            option.value = time
            option.innerText = time
            timeSelect.appendChild(option)
        })

        timeSelect.disabled = false
        submitAppointmentBtn.disabled = false
    })
    .catch(error => console.error(error))
})

appointmentForm.addEventListener("submit", function(event) {
    event.preventDefault()

    if (!window.currentBusinessId || !window.foundClientId || !confirmPhone.value.trim() || !appointmentDate.value || !timeSelect.value) {
        showToast("Preencha o telefone (aguarde a confirmação do nome), data e horário.", true)
        return
    }

    const servicesConfigured = servicesSection && servicesSection.style.display !== "none"
    if (servicesConfigured && !window.selectedServiceId) {
        showToast("Selecione um serviço antes de continuar.", true)
        return
    }

    fetch(`${API_URL}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            business_id: window.currentBusinessId,
            client_id: window.foundClientId,
            service_id: window.selectedServiceId,
            phone: confirmPhone.value.trim(),
            date: appointmentDate.value,
            time: timeSelect.value
        })
    })
    .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || "Erro ao agendar")
        return data
    })
    .then(data => {
        showToast("Agendamento realizado com sucesso!")
        appointmentForm.reset()
        confirmPhone.value = ""
        clientFoundMsg.innerText = ""
        if (existingAppointmentsBox) existingAppointmentsBox.style.display = "none"
        window.foundClientId = null
        window.selectedServiceId = null
        document.querySelectorAll(".service-option").forEach(el => el.classList.remove("selected"))
        timeSelect.disabled = true
        submitAppointmentBtn.disabled = true
    })
    .catch(error => {
        console.error(error)
        showToast(error.message, true)
    })
})

initBusinessContext()
