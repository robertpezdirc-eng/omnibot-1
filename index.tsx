import { GoogleGenAI, Type, Chat, Content } from "@google/genai";

// --- CONFIGURATION ---
const PARTICLE_COUNT = 150;
const PARTICLE_SPEED = 0.4;
const CONNECTION_DISTANCE = 120;
const MOUSE_REPULSION_RADIUS = 150;
const MOUSE_REPULSION_STRENGTH = 1.2;
const CLICK_SHOCKWAVE_STRENGTH = 10;
const DATA_PULSE_SPEED = 4;

// --- API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = "gemini-2.5-flash";

// --- DOM ELEMENTS ---
const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const body = document.body;
const contentPanel = document.getElementById('content-panel')!;
const contentBody = document.getElementById('content-body')!;
const lightbox = document.getElementById('lightbox') as HTMLDivElement;
const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement;
const closeLightboxButton = document.getElementById('close-lightbox')!;
const nexusCore = document.getElementById('nexus-core')!;
const initialView = document.getElementById('initial-view')!;
const inputView = document.getElementById('input-view')!;
const promptTextarea = document.getElementById('prompt-textarea') as HTMLTextAreaElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const confirmBtn = document.getElementById('confirm-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const branchSelector = document.getElementById('branch-selector')!;
const activeBranchIndicator = document.getElementById('active-branch-indicator')!;


// --- NEXUS BRANCH CONFIGURATION ---
const branches = {
  general: {
    name: "Splošno",
    icon: "public",
    theme: "general",
    description: "Vsakdanji pomočnik za hitre odgovore in splošne naloge.",
    systemInstruction: `Ti si Omnibot, univerzalni profesionalni AI asistent, ki zna vse. Deluješ kot vsevedni strokovnjak za vsa področja: arhitekturo, strojništvo, turizem, medicino, programiranje in vsakdanje življenje. Tvoj cilj je, da samodejno zaznaš namero uporabnika in sprožiš ustrezen modul za zagotovitev celovitega, vizualnega in besedilnega odgovora. Osebnost: Profesionalna, vsevedna, ustrežljiva in rahlo futuristična. Vedno odgovarjaj v slovenščini.`
  },
  science: {
    name: "Znanost & Tech",
    icon: "science",
    theme: "science",
    description: "Analize, programska koda, raziskovanje in tehnične specifikacije.",
    systemInstruction: `Ti si Omnibot - Znanstveni Modul. Specializiran si za znanost, tehnologijo, programiranje in inženirstvo. Tvoji odgovori so natančni, analitični in podkrepljeni s tehničnimi podatki. Pri kodiranju vedno podaj čisto, učinkovito in dobro komentirano kodo. Osebnost: Analitična, precizna, inovativna. Vedno odgovarjaj v slovenščini.`
  },
  art: {
    name: "Umetnost & Dizajn",
    icon: "palette",
    theme: "art",
    description: "Generiranje vizualij, kreativno pisanje in estetski nasveti.",
    systemInstruction: `Ti si Omnibot - Umetniški Modul. Tvoja domena je kreativnost: vizualna umetnost, dizajn, glasba in literatura. Navdihuješ, ustvarjaš in svetuješ o estetiki. Tvoji odgovori so polni domišljije, vizualnih opisov in nekonvencionalnih idej. Osebnost: Kreativna, navdihujoča, vizionarska. Vedno odgovarjaj v slovenščini.`
  },
  business: {
    name: "Ekonomija & Posel",
    icon: "insights",
    theme: "business",
    description: "Poslovne strategije, tržne analize, finance in vodenje projektov.",
    systemInstruction: `Ti si Omnibot - Poslovni Modul. Specializiran si za ekonomijo, finance, trženje in poslovne strategije. Tvoji odgovori so strateški, podatkovno usmerjeni in osredotočeni na učinkovitost ter rast. Pripravljaš poročila, analize in poslovne načrte. Osebnost: Strateška, analitična, odločna. Vedno odgovarjaj v slovenščini.`
  }
};
const RESPONSE_FORMAT_INSTRUCTION = `ODZIVNI FORMAT:
Vedno se odzovi v formatu JSON, ki ustreza naslednji shemi:
{
  "module": "ena od naslednjih možnosti: 'TEXT', 'IMAGE', 'ARCHITECTURAL_PLAN', '3D_MODEL', 'DOCUMENT', 'VIDEO', 'SEARCH', 'MAP', 'OTHER'",
  "response": "Tvoj podroben tekstovni odgovor v slovenščini, formatiran z markdownom. Za 'ARCHITECTURAL_PLAN' in '3D_MODEL' mora ta odgovor VSEBOVATI tehnične podrobnosti in mere.",
  "suggestions": ["Predlog 1", "Predlog 2", "Predlog 3"],
  "visual_query": "Kratek, optimiziran ukaz v ANGLEŠČINI za generiranje vizualne vsebine (za IMAGE, ARCHITECTURAL_PLAN, 3D_MODEL, VIDEO) ali ime lokacije za MAP. Za ostale module je to null.",
  "exportable": true
}

PRAVILA ZA MODULE:
- 'TEXT': Standardni tekstovni odgovor za splošna vprašanja.
- 'IMAGE': Ustvari fotorealistično sliko, risbo ali digitalno umetnost. Uporabi 'visual_query'.
- 'ARCHITECTURAL_PLAN': Ustvari arhitekturni načrt. V 'response' vključi podrobne tehnične mere in opis prostorov. V 'visual_query' podaj ukaz za tloris.
- '3D_MODEL': Ustvari 3D model. V 'response' vključi tehnične specifikacije. V 'visual_query' podaj ukaz za tehnični render.
- 'DOCUMENT': Pripravi profesionalne zapiske, tabele ali kodo. Vsebino formatiraj znotraj 'response' z uporabo markdowna. 'visual_query' je null.
- 'VIDEO': Ustvari video. Uporabi 'visual_query'.
- 'SEARCH': Uporabi za najnovejše informacije. 'response' naj bo "SEARCHING::[uporabnikova poizvedba]".
- 'MAP': Pokaži lokacijo. 'visual_query' je ime lokacije.
- 'exportable': Vedno nastavi na 'true' za načrte, modele, dokumente in daljše odgovore.`;

// --- PARTICLE CLASS (no changes) ---
class Particle {
  x: number; y: number; z: number;
  vx: number; vy: number;
  baseRadius: number; radius: number;
  isPulsing: boolean = false;
  pulseProgress: number = 0;
  pulseDuration: number = 80; // frames for a pulse
  pulseStrength: number = 1.5;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.z = Math.random() * 0.8 + 0.2; // Depth (0.2 to 1.0)
    this.vx = (Math.random() - 0.5) * PARTICLE_SPEED * this.z;
    this.vy = (Math.random() - 0.5) * PARTICLE_SPEED * this.z;
    this.baseRadius = (Math.random() * 1.5 + 1) * this.z;
    this.radius = this.baseRadius;
  }

  update(mouse: { x: number; y: number }, shockwave: { progress: number }) {
    if (this.isPulsing) {
        this.pulseProgress++;
        const pulseRatio = this.pulseProgress / this.pulseDuration;
        this.radius = this.baseRadius + Math.sin(pulseRatio * Math.PI) * this.baseRadius * this.pulseStrength;
        if (this.pulseProgress >= this.pulseDuration) {
            this.isPulsing = false;
            this.pulseProgress = 0;
            this.radius = this.baseRadius;
        }
    } else if (Math.random() < 0.001) { this.isPulsing = true; }
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    let dx = this.x - mouse.x;
    let dy = this.y - mouse.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < MOUSE_REPULSION_RADIUS) {
      const forceDirectionX = dx / distance;
      const forceDirectionY = dy / distance;
      const force = (MOUSE_REPULSION_RADIUS - distance) / MOUSE_REPULSION_RADIUS;
      this.vx += forceDirectionX * force * MOUSE_REPULSION_STRENGTH * this.z;
      this.vy += forceDirectionY * force * MOUSE_REPULSION_STRENGTH * this.z;
    }
    if (shockwave.progress > 0) {
        dx = this.x - canvas.width / 2;
        dy = this.y - canvas.height / 2;
        distance = Math.sqrt(dx * dx + dy * dy);
        const shockwaveRadius = shockwave.progress * canvas.width;
        if (distance > shockwaveRadius - 50 && distance < shockwaveRadius + 50) {
            const force = (1 - Math.abs(distance - shockwaveRadius) / 50);
            this.vx += (dx / distance) * force * CLICK_SHOCKWAVE_STRENGTH * (1 - shockwave.progress);
            this.vy += (dy / distance) * force * CLICK_SHOCKWAVE_STRENGTH * (1 - shockwave.progress);
        }
    }
  }
  draw(color: string) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.globalAlpha = this.z * 0.9;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
}
// --- DATA PULSE CLASS (no changes) ---
class DataPulse {
    x: number; y: number;
    targetX: number; targetY: number;
    progress: number = 0;
    constructor(p1: Particle, p2: Particle) {
        this.x = p1.x; this.y = p1.y;
        this.targetX = p2.x; this.targetY = p2.y;
    }
    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > DATA_PULSE_SPEED) {
            this.x += (dx / dist) * DATA_PULSE_SPEED;
            this.y += (dy / dist) * DATA_PULSE_SPEED;
        } else {
            this.progress = 1; // Mark as finished
        }
    }
    draw(color: string) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    }
}
// --- EFFECT PARTICLE CLASS ---
class EffectParticle {
    x: number; y: number;
    vx: number; vy: number;
    lifespan: number;
    initialLifespan: number;
    radius: number;

    constructor(x: number, y: number) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.lifespan = Math.random() * 60 + 40; // 40-100 frames
        this.initialLifespan = this.lifespan;
        this.radius = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98; // friction
        this.vy *= 0.98;
        this.lifespan--;
    }

    draw(color: string) {
        ctx.save();
        ctx.beginPath();
        const alpha = this.lifespan / this.initialLifespan;
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- STATE ---
let particles: Particle[] = [];
let dataPulses: DataPulse[] = [];
let effectParticles: EffectParticle[] = [];
let animationFrameId: number;
let isWorking = false;
let isGeneratingText = false;
let isStopping = false;
let shockwave = { progress: 0 };
const mouse = { x: -1000, y: -1000 };
let activeBranchId: string | null = null;
let chat: Chat | null = null;
const chatHistories: Record<string, Content[]> = {};

// --- INITIALIZATION ---
function init() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
  }
  setupBranchSelector();
  updateUiState('initial');
  if (!animationFrameId) {
    animate();
  }
}

// --- ANIMATION LOOP ---
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const glowColor = getComputedStyle(body).getPropertyValue('--glow-color').trim();

  if (shockwave.progress > 0 && shockwave.progress < 1) {
      shockwave.progress += 0.02;
  } else { shockwave.progress = 0; }
  
  connectParticles(glowColor);
  particles.forEach(p => {
    p.update(mouse, shockwave);
    p.draw(glowColor);
  });
  
  if (isWorking && Math.random() < 0.03 && dataPulses.length < 5) {
    const p1 = particles[Math.floor(Math.random() * particles.length)];
    const p2 = particles[Math.floor(Math.random() * particles.length)];
    if (p1 !== p2) dataPulses.push(new DataPulse(p1, p2));
  }
  dataPulses = dataPulses.filter(p => p.progress < 1);
  dataPulses.forEach(p => { p.update(); p.draw(glowColor); });

  effectParticles = effectParticles.filter(p => p.lifespan > 0);
  effectParticles.forEach(p => { p.update(); p.draw(glowColor); });

  if (nexusCore && body.classList.contains('state-initial')) {
      const dx = mouse.x - window.innerWidth / 2;
      const dy = mouse.y - window.innerHeight / 2;
      const tiltX = dy / window.innerHeight * -15; 
      const tiltY = dx / window.innerWidth * 15;
      nexusCore.style.setProperty('--tilt-x', `${tiltX}deg`);
      nexusCore.style.setProperty('--tilt-y', `${tiltY}deg`);
  }
  
  animationFrameId = requestAnimationFrame(animate);
}

// --- PARTICLE CONNECTION LOGIC (no changes) ---
function connectParticles(color: string) {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p1 = particles[i]; const p2 = particles[j];
      const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      if (distance < CONNECTION_DISTANCE) {
        ctx.save();
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = (1 - distance / CONNECTION_DISTANCE) * avgZ * 0.8;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * avgZ;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// --- NEW APP LOGIC ---
type AiState = 'searching' | 'generating' | 'analyzing' | 'visualizing' | 'idle';
type UiState = 'initial' | 'input' | 'working';

function setupBranchSelector() {
    branchSelector.innerHTML = '';
    for (const branchId in branches) {
        const branch = branches[branchId as keyof typeof branches];
        const card = document.createElement('div');
        card.className = 'branch-card';
        card.style.setProperty('--glow-color', `var(--${branch.theme}-color)`);
        card.innerHTML = `
            <span class="material-symbols-outlined">${branch.icon}</span>
            <h3>${branch.name}</h3>
            <p>${branch.description}</p>
        `;
        card.onclick = () => selectBranch(branchId);
        branchSelector.appendChild(card);
    }
}

function selectBranch(branchId: string) {
    activeBranchId = branchId;
    const branch = branches[branchId as keyof typeof branches];
    body.dataset.theme = branch.theme;
    
    // Update active branch indicator
    activeBranchIndicator.innerHTML = `
      <span class="material-symbols-outlined">${branch.icon}</span>
      <span>${branch.name}</span>
    `;
    
    // Load history and initialize chat
    const history = chatHistories[branchId] || [];
    contentBody.innerHTML = '';
    history.forEach(message => {
        if (message.role === 'user') {
            appendUserMessage(message.parts[0].text!, true);
        } else {
            const aiMsgDiv = appendAiMessage(true);
            const content = aiMsgDiv.querySelector('.message-content') as HTMLElement;
            // This is a simplified display of history. For full fidelity, we'd need to parse the JSON.
            try {
              const parsed = JSON.parse(message.parts[0].text!);
              content.innerHTML = parseMarkdown(parsed.response);
              addCopyButtonListeners(content);
            } catch(e) {
               content.innerHTML = parseMarkdown(message.parts[0].text!);
            }

        }
    });

    const systemInstruction = branch.systemInstruction + '\n\n' + RESPONSE_FORMAT_INSTRUCTION;
    chat = ai.chats.create({ model, config: { systemInstruction }, history });

    updateUiState('input');
}

function updateUiState(state: UiState) {
    const uiStates = ['state-initial', 'state-input', 'state-working'];
    body.classList.remove(...uiStates);
    body.classList.add(`state-${state}`);

    if (state === 'initial') {
        contentPanel.classList.add('hidden');
        body.dataset.theme = 'general';
        activeBranchId = null;
        chat = null;
        setAiState('idle');
    } else if (state === 'input') {
        contentPanel.classList.remove('hidden');
        promptTextarea.value = '';
        promptTextarea.focus();
        setAiState('idle');
    } else if (state === 'working') {
        contentPanel.classList.remove('hidden');
    }
}

function setAiState(state: AiState) {
    const aiStates = ['searching', 'generating', 'analyzing', 'visualizing', 'working'];
    aiStates.forEach(s => body.classList.remove(s));

    if (state === 'idle') {
        isWorking = false;
        dataPulses = [];
    } else {
        body.classList.add('working', state);
        isWorking = true;
    }
}

async function sendMessageToAI(prompt: string) {
    if (!chat || !activeBranchId) return;
    
    appendUserMessage(prompt);
    const aiMessageDiv = appendAiMessage();
    const aiMessageContent = aiMessageDiv.querySelector('.message-content') as HTMLElement;

    document.querySelector('.message-footer')?.remove();
    
    setAiState('analyzing');
    
    // Manage history manually for this implementation
    chatHistories[activeBranchId] = chatHistories[activeBranchId] || [];
    chatHistories[activeBranchId].push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                module: { type: Type.STRING },
                response: { type: Type.STRING },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                visual_query: { type: Type.STRING, nullable: true },
                exportable: { type: Type.BOOLEAN },
            }
        };

        const planningResponse = await chat.sendMessage({
            message: prompt,
            config: { responseMimeType: 'application/json', responseSchema },
        });

        const jsonResponse = JSON.parse(planningResponse.text);

        if (jsonResponse.response.startsWith('SEARCHING::')) {
            const searchQuery = jsonResponse.response.replace('SEARCHING::', '').trim();
            await performWebSearch(searchQuery, aiMessageDiv);
            return;
        }
        
        // Save model's response to our history
        chatHistories[activeBranchId].push({ role: 'model', parts: [{ text: planningResponse.text }] });
        
        const { module, response: generatedText, suggestions, visual_query, exportable } = jsonResponse;
        
        let visualTask: Promise<any> = Promise.resolve();
        
        switch(module) {
            case 'IMAGE': case 'ARCHITECTURAL_PLAN': case '3D_MODEL':
                visualTask = generateImageContent(visual_query, aiMessageDiv); break;
            case 'VIDEO':
                visualTask = generateVideoContent(visual_query, aiMessageDiv); break;
            case 'MAP':
                 generateMapContent(visual_query, aiMessageDiv); break;
        }

        setAiState('generating');

        typewriterEffect(generatedText, aiMessageContent, async (wasCompleted) => {
           await visualTask;
           if (wasCompleted) {
                renderFooter(aiMessageDiv, suggestions, exportable);
           } else {
               aiMessageContent.innerHTML += "<br><em>--- PREKINJENO ---</em>";
               contentBody.scrollTop = contentBody.scrollHeight;
           }
           updateUiState('input');
        });

    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        aiMessageContent.textContent = "Napaka pri povezavi z jedrom AI. Prosim, poskusi znova.";
        chatHistories[activeBranchId!].pop(); // Remove user message on error
        updateUiState('input');
    }
}

async function performWebSearch(query: string, messageElement: HTMLElement) {
    setAiState('searching');
    const contentElement = messageElement.querySelector('.message-content') as HTMLElement;
    contentElement.textContent = `Iskanje za: "${query}"...`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: { tools: [{googleSearch: {}}] },
        });

        if (activeBranchId) {
            chatHistories[activeBranchId].push({ role: 'model', parts: [{ text: response.text }] });
        }
        
        contentElement.innerHTML = '';
        setAiState('generating');
        typewriterEffect(response.text, contentElement, (completed) => {
            if(completed) {
                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    renderGroundingSources(groundingChunks, messageElement);
                }
            }
            updateUiState('input');
        });

    } catch (error) {
        console.error("Error during web search:", error);
        contentElement.textContent = "Napaka med iskanjem po spletu.";
        updateUiState('input');
    }
}

async function generateImageContent(query: string, messageElement: HTMLElement) {
    const visualContainer = createVisualContainer(messageElement);
    try {
        const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: query,
        });
        
        const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = query;
        img.className = 'holographic-image';
        img.onclick = () => openLightbox(imageUrl);
        visualContainer.innerHTML = '';
        visualContainer.appendChild(img);
    } catch (error) {
        console.error("Error generating image content:", error);
        visualContainer.innerHTML = `<p class="visual-status-text">Napaka pri generiranju slike.</p>`;
    }
    contentBody.scrollTop = contentBody.scrollHeight;
}

async function generateVideoContent(prompt: string, messageElement: HTMLElement) {
    const visualContainer = createVisualContainer(messageElement, "Pripravljam zahtevo za video...");
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: prompt,
        });

        const statusElement = visualContainer.querySelector('.visual-status-text') as HTMLElement;
        statusElement.textContent = "Generiram video... (to lahko traja nekaj minut)";
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
            const video = document.createElement('video');
            video.src = videoUrl;
            video.controls = true;
            video.className = 'holographic-video';
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            visualContainer.innerHTML = '';
            visualContainer.appendChild(video);
        } else {
             visualContainer.innerHTML = `<p class="visual-status-text">Video generiran, a ni bilo mogoče pridobiti povezave.</p>`;
        }
    } catch (error) {
        console.error("Error generating video content:", error);
        visualContainer.innerHTML = `<p class="visual-status-text">Napaka pri generiranju videa.</p>`;
    }
}


function generateMapContent(query: string, messageElement: HTMLElement) {
    const visualContainer = createVisualContainer(messageElement);
    const mapLink = document.createElement('a');
    mapLink.href = `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
    mapLink.target = '_blank';
    mapLink.rel = 'noopener noreferrer';
    mapLink.className = 'map-button';
    mapLink.innerHTML = `<span class="material-symbols-outlined">map</span><span>Prikaži zemljevid za "${query}"</span>`;
    visualContainer.innerHTML = '';
    visualContainer.appendChild(mapLink);
    contentBody.scrollTop = contentBody.scrollHeight;
}

function createVisualContainer(messageElement: HTMLElement, initialText: string = ''): HTMLElement {
    const visualContainer = document.createElement('div');
    visualContainer.className = 'visual-container';
    const loader = document.createElement('div');
    loader.className = 'visual-loader';
    visualContainer.appendChild(loader);

    if (initialText) {
        const text = document.createElement('p');
        text.className = 'visual-status-text';
        text.textContent = initialText;
        visualContainer.appendChild(text);
    }
    
    messageElement.appendChild(visualContainer);
    contentBody.scrollTop = contentBody.scrollHeight;
    return visualContainer;
}


function createContentBurst() {
    const rect = contentBody.getBoundingClientRect();
    if(rect.width === 0) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    for (let i = 0; i < 40; i++) {
        effectParticles.push(new EffectParticle(centerX, centerY));
    }
}

function parseMarkdown(text: string): string {
    let html = text;

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="code-block-wrapper">
                    <pre><code class="language-${lang || 'plaintext'}">${escapedCode.trim()}</code></pre>
                    <button class="copy-btn" title="Kopiraj kodo">
                        <span class="material-symbols-outlined">content_copy</span>
                    </button>
                </div>`;
    });

    html = html.replace(/^\|(.+)\|\n\|-+\|([\s\S]*?)(?:\n\n|\n$)/gm, (match, headerLine, bodyLines) => {
        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        const rows = bodyLines.trim().split('\n').map(rowLine => rowLine.split('|').slice(1, -1).map(c => c.trim()));
        
        let table = '<table><thead><tr>';
        headers.forEach(h => table += `<th>${h}</th>`);
        table += '</tr></thead><tbody>';
        rows.forEach(row => {
            table += '<tr>';
            row.forEach(cell => table += `<td>${cell}</td>`);
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    });

    html = html.replace(/^- (.*)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s?<ul>/g, '');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return html;
}

function addCopyButtonListeners(container: HTMLElement) {
    container.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const wrapper = button.parentElement;
            const code = wrapper?.querySelector('code');
            if (code) {
                navigator.clipboard.writeText(code.innerText).then(() => {
                    const icon = button.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.textContent = 'done';
                        button.classList.add('copied');
                        setTimeout(() => {
                            icon.textContent = 'content_copy';
                            button.classList.remove('copied');
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        });
    });
}

function typewriterEffect(text: string, element: HTMLElement, onComplete: (wasCompleted: boolean) => void) {
    let i = 0;
    element.innerHTML = '';
    isGeneratingText = true;
    isStopping = false;

    function type() {
        if (isStopping) {
            isGeneratingText = false;
            onComplete(false);
            return;
        }
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            contentBody.scrollTop = contentBody.scrollHeight;
            setTimeout(type, 10);
        } else {
            isGeneratingText = false;
            createContentBurst();
            element.innerHTML = parseMarkdown(text);
            addCopyButtonListeners(element);
            onComplete(true);
        }
    }
    type();
}

function appendUserMessage(text: string, isFromHistory: boolean = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';
    if(isFromHistory) messageDiv.style.animation = 'none';
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="material-symbols-outlined">account_circle</span>
        <div class="message-content">${text}</div>
      </div>
    `;
    contentBody.appendChild(messageDiv);
    contentBody.scrollTop = contentBody.scrollHeight;
}

function appendAiMessage(isFromHistory: boolean = false): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message ai-message';
    if(isFromHistory) messageDiv.style.animation = 'none';
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="material-symbols-outlined">psychology</span>
        <div class="message-content">...</div>
      </div>
    `;
    contentBody.appendChild(messageDiv);
    contentBody.scrollTop = contentBody.scrollHeight;
    return messageDiv;
}


function renderFooter(messageDiv: HTMLElement, suggestions: string[], exportable: boolean) {
    if ((!suggestions || suggestions.length === 0) && !exportable) return;

    const footerContainer = document.createElement('div');
    footerContainer.className = 'message-footer';

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'content-suggestions';

    if (suggestions) {
        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = suggestion;
            btn.onclick = () => {
                promptTextarea.value = suggestion;
                handleConfirm();
            };
            suggestionsContainer.appendChild(btn);
        });
    }
    footerContainer.appendChild(suggestionsContainer);

    if (exportable) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.innerHTML = `<span class="material-symbols-outlined">print</span>Natisni/Izvozi`;
        exportBtn.onclick = () => handleExport(messageDiv);
        footerContainer.appendChild(exportBtn);
    }

    messageDiv.appendChild(footerContainer);
    contentBody.scrollTop = contentBody.scrollHeight;
}

function renderGroundingSources(chunks: any[], messageElement: HTMLElement) {
    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'grounding-sources';
    sourcesContainer.innerHTML = `<p>Viri:</p>`;
    const list = document.createElement('ol');
    chunks.forEach(chunk => {
        if (chunk.web) {
            const item = document.createElement('li');
            item.innerHTML = `<a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer">${chunk.web.title}</a>`;
            list.appendChild(item);
        }
    });
    sourcesContainer.appendChild(list);
    messageElement.appendChild(sourcesContainer);
    contentBody.scrollTop = contentBody.scrollHeight;
}

function handleExport(messageElement: HTMLElement) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const contentToPrint = messageElement.cloneNode(true) as HTMLElement;
        contentToPrint.querySelector('.message-footer')?.remove();
        contentToPrint.querySelectorAll('.copy-btn').forEach(btn => btn.remove());

        printWindow.document.write(`
            <html>
                <head>
                    <title>Omnibot Izpis</title>
                    <style>
                        body { font-family: sans-serif; line-height: 1.6; color: #333; }
                        .chat-message { border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .message-header { display: flex; gap: 10px; align-items: flex-start; }
                        .material-symbols-outlined { display: none; }
                        img, video { max-width: 100%; }
                        .code-block-wrapper { position: relative; }
                        pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; }
                        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .grounding-sources { margin-top: 15px; font-size: 0.8em; }
                        a { color: #0066cc; }
                    </style>
                </head>
                <body>
                    ${contentToPrint.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    }
}

function handleResize() {
  cancelAnimationFrame(animationFrameId);
  init();
}

function handleMouseMove(event: MouseEvent) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function handleConfirm() {
    const prompt = promptTextarea.value.trim();
    if (prompt === '' || isWorking) return;
    
    updateUiState('working');
    sendMessageToAI(prompt);
}


function openLightbox(src: string) {
    lightboxImage.src = src;
    lightbox.classList.remove('hidden');
}

function closeLightbox() {
    lightbox.classList.add('hidden');
    lightboxImage.src = '';
}

window.addEventListener('resize', handleResize);
window.addEventListener('mousemove', handleMouseMove);
closeLightboxButton.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

backBtn.addEventListener('click', () => updateUiState('initial'));
confirmBtn.addEventListener('click', handleConfirm);
stopBtn.addEventListener('click', () => {
    if (isGeneratingText) {
        isStopping = true;
        appendUserMessage("<em>Ukaz prekinjen.</em>");
    }
});
promptTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
    }
});

init();