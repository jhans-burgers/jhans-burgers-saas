
import { AppConfig } from "./types";

export const formatTime = (timestamp: any) => {
  if (!timestamp || !timestamp.seconds) return '-';
  return new Date(timestamp.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.seconds) return '-';
  return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
};

export const isToday = (timestamp: any) => {
    if (!timestamp || !timestamp.seconds) return false;
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const parseCurrency = (val: string) => {
    if(!val) return 0;
    if(typeof val === 'number') return val;
    return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
}

export const normalizePhone = (phone: string) => {
    if (!phone) return '';
    let p = phone.replace(/\D/g, ''); 
    if (p.startsWith('55') && p.length > 11) p = p.substring(2); 
    if (p.length === 11 && p[2] === '9') {
        p = p.substring(0, 2) + p.substring(3);
    }
    return p;
};

// --- NOVA FUNÇÃO DE FORMATAÇÃO VISUAL ---
export const formatPhoneNumberDisplay = (value: string) => {
    if (!value) return "";
    
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, "");
    
    // Se colou com +55 ou 55 no início e tem tamanho de número completo (12 ou 13 dígitos), remove o 55
    if (numbers.startsWith('55') && numbers.length >= 12) {
        numbers = numbers.substring(2);
    }

    // Aplica a máscara (XX) XXXXX-XXXX para celular BR
    if (numbers.length <= 11) {
        return numbers
            .replace(/^(\d{2})/, "($1) ")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .substr(0, 15); // Limita tamanho visual
    }
    
    // Se ainda for muito grande, retorna o original (internacional ou erro)
    return value; 
};

export const capitalize = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
};

export const toSentenceCase = (str: string) => {
    if (!str) return '';
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// --- NORMALIZAÇÃO PARA BUSCA (CAIXA BAIXA + SEM ACENTO) ---
export const normalizeForSearch = (text: string) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

export const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(err => console.error("Erro ao copiar", err));
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error("Erro ao copiar", err);
        }
        document.body.removeChild(textArea);
    }
};

export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Aumentado um pouco para logos
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = height * (MAX_WIDTH / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8)); 
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

export const parseOrderItems = (itemsString: string) => {
    if (!itemsString) return [];
    const lines = itemsString.split('\n');
    const items: {qty: number, name: string}[] = [];
    lines.forEach(line => {
        const cleanLine = line.trim();
        if(!cleanLine || cleanLine.startsWith('---') || cleanLine.startsWith('Obs:')) return;
        const match = cleanLine.match(/^(\d+)[xX\s]+(.+)/);
        if(match) items.push({ qty: parseInt(match[1]), name: match[2].trim() });
        else items.push({ qty: 1, name: cleanLine });
    });
    return items;
};

// --- FUNÇÕES GERADORAS DE PIX (PADRÃO BR CODE) ---

const crc16ccitt = (payload: string) => {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        let c = payload.charCodeAt(i);
        crc ^= c << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc = crc & 0xFFFF; // Garante 16 bits
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
};

const normalizeText = (text: string) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-zA-Z0-9 ]/g, "")   
        .replace(/\s+/g, ' ')            
        .trim()
        .toUpperCase();
};

const sanitizeAscii = (str: string) => str.replace(/[^\x20-\x7E]/g, '');

export const generatePixPayload = (key: string, name: string, city: string, amount: number, txId: string = '***') => {
    let cleanKey = sanitizeAscii(key || '').trim();
    if (!cleanKey.includes('@')) {
        const isEVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);
        if (!isEVP) {
            const raw = cleanKey.replace(/[\(\)\-\.\s\/]/g, '');
            if (/^\d+$/.test(raw)) {
                 if (raw.length === 11 && raw[2] === '9') {
                     cleanKey = '+55' + raw;
                 } else {
                     cleanKey = raw; 
                 }
            } else if (cleanKey.startsWith('+')) {
                 cleanKey = '+' + raw.replace('+', ''); 
            } else {
                cleanKey = raw;
            }
        }
    }

    const cleanName = normalizeText(name || 'RECEBEDOR').substring(0, 25) || 'RECEBEDOR';
    const cleanCity = normalizeText(city || 'BRASIL').substring(0, 15) || 'BRASIL';
    
    let cleanTxId = sanitizeAscii(txId || '***');
    if (cleanTxId !== '***') {
        cleanTxId = cleanTxId.replace(/[^a-zA-Z0-9]/g, '');
    }
    if (!cleanTxId) cleanTxId = '***';
    cleanTxId = cleanTxId.substring(0, 25);

    const amountStr = amount.toFixed(2);

    let payload = 
        formatField('00', '01') +                              
        formatField('26',                                      
            formatField('00', 'BR.GOV.BCB.PIX') + 
            formatField('01', cleanKey)
        ) +
        formatField('52', '0000') +                           
        formatField('53', '986') +                            
        formatField('54', amountStr) +                        
        formatField('58', 'BR') +                             
        formatField('59', cleanName) +                        
        formatField('60', cleanCity) +                        
        formatField('62',                                     
            formatField('05', cleanTxId)                      
        ) +
        '6304';                                               

    payload += crc16ccitt(payload);
    return payload;
};

// AUXILIAR PARA FORMATAR ID
export const formatOrderId = (id: string) => {
    if (!id) return '???';
    // Se for formato PED-XXXXXX, exibe limpo
    if (id.startsWith('PED-')) return id;
    
    // Se for ID legado do Firebase (longo), trunca
    if (id.length > 10) {
        return '#' + id.slice(0, 6).toUpperCase();
    }
    
    // Fallback padrão
    const cleanId = id.replace(/^#/, '');
    return '#' + cleanId;
};

// --- HELPER LINK PIX ---
export const getPixPaymentLink = (orderId: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?mode=pix&oid=${orderId}`;
};

// EMOJIS SEGUROS (Literais)
export const EMOJI = {
    GIFT: '🎁',
    HEART: '❤️',
    BURGER: '🍔',
    WAVE: '👋',
    SMILE_HEARTS: '🥰',
    MONEY_BAG: '💰',
    WARNING: '⚠️',
    SMILE: '😀',
    SCOOTER: '🛵',
    DASH: '💨',
    CHEF: '👨‍🍳',
    FIRE: '🔥',
    STARS: '✨',
    WRITE: '📝'
};

export const generateReceiptText = (order: any, appName: string, pixData?: any) => {
    const safeName = appName || 'Jhans Burgers';
    const date = formatDate(order.createdAt);
    const time = formatTime(order.createdAt);
    const displayId = formatOrderId(order.id);
    
    let text = `*${safeName.toUpperCase()}*\n*Pedido ${displayId}*\n📅 ${date} - ${time}\n\n*Cliente:* ${order.customer}\n*Tel:* ${order.phone}\n*End:* ${order.address}\n\n*--------------------------------*\n*ITENS:*\n${order.items}\n\n*--------------------------------*\n*TOTAL:* ${formatCurrency(order.value || 0)}\n\n`;
    
    if (order.deliveryFee === 0 || !order.deliveryFee) {
        text += `*Entrega:* GRÁTIS (Presente da Casa) ${EMOJI.GIFT}\n`;
    }

    text += `*Pagamento:* ${order.paymentMethod || 'Dinheiro'}\n${order.obs ? `\n*Obs:* ${order.obs}` : ''}`;
    
    text += `\n\n*Status:* Fique tranquilo! Seu pedido será preparado com muito carinho. ${EMOJI.HEART}${EMOJI.BURGER}`;

    if (pixData && order.paymentMethod && order.paymentMethod.toUpperCase().includes('PIX') && pixData.pixKey) {
         const link = getPixPaymentLink(order.id);
         
         text += `\n\n*--------------------------------*\n`;
         text += `*PAGAMENTO PIX RÁPIDO:*\n`;
         text += `Clique no link abaixo para copiar o código:\n`;
         text += `${link}\n`; 
         text += `--------------------------------\n\n`;
    }
    
    return text;
};

// --- NOVA FUNÇÃO: IMPRESSÃO DE TICKET TÉRMICO ---
export const printOrderTicket = (order: any, appConfig: any) => {
    const width = appConfig.printerWidth || '80mm';
    const safeName = appConfig.appName || 'Delivery';
    const displayId = formatOrderId(order.id);
    const date = formatDate(order.createdAt);
    const time = formatTime(order.createdAt);
    
    // Tratamento dos itens para HTML
    const itemsHtml = order.items.split('\n').map((line: string) => {
        if (line.includes('---')) return '<hr style="border-top: 1px dashed #000; margin: 5px 0;">';
        if (line.toLowerCase().startsWith('obs:')) return `<div style="font-size: 0.9em; font-style: italic; margin-left: 10px;">${line}</div>`;
        return `<div style="font-weight: bold; margin-bottom: 2px;">${line}</div>`;
    }).join('');

    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return alert('Habilite popups para imprimir.');

    const htmlContent = `
        <html>
        <head>
            <title>Cupom #${displayId}</title>
            <style>
                @page { margin: 0; }
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    width: ${width}; 
                    margin: 0 auto; 
                    padding: 10px;
                    color: #000;
                    background: #fff;
                }
                .header { text-align: center; margin-bottom: 10px; }
                .title { font-size: 1.2em; font-weight: bold; text-transform: uppercase; }
                .subtitle { font-size: 0.9em; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .info { font-size: 0.9em; margin-bottom: 5px; }
                .label { font-weight: bold; }
                .items { margin: 10px 0; font-size: 0.9em; }
                .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 10px; }
                .footer { text-align: center; font-size: 0.8em; margin-top: 20px; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${safeName}</div>
                <div class="subtitle">Pedido ${displayId}</div>
                <div class="subtitle">${date} - ${time}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="info"><span class="label">Cliente:</span> ${order.customer}</div>
            <div class="info"><span class="label">Tel:</span> ${order.phone}</div>
            <div class="info"><span class="label">End:</span> ${order.address}</div>
            ${order.neighborhood ? `<div class="info"><span class="label">Bairro:</span> ${order.neighborhood}</div>` : ''}
            
            <div class="divider"></div>
            
            <div class="items">
                ${itemsHtml}
            </div>
            
            <div class="divider"></div>
            
            <div class="info"><span class="label">Pagamento:</span> ${order.paymentMethod}</div>
            ${order.deliveryFee > 0 ? `<div class="info" style="text-align: right;">Entrega: ${formatCurrency(order.deliveryFee)}</div>` : ''}
            <div class="total">TOTAL: ${formatCurrency(order.value)}</div>
            
            ${order.obs ? `<div class="divider"></div><div class="info"><span class="label">Obs Geral:</span> ${order.obs}</div>` : ''}
            
            <div class="footer">
                <p>Obrigado pela preferência!</p>
                <p>--- Fim do Cupom ---</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    // window.close(); // Opcional: fechar automaticamente
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

export const downloadCSV = (content: string, fileName: string) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getOrderReceivedText = (order: any, appName: string, estimatedTime?: string) => {
    const safeName = appName || 'Jhans Burgers';
    const isPix = order.paymentMethod?.toLowerCase().includes('pix');
    const displayId = formatOrderId(order.id);
    const customerName = order.customer.split(' ')[0]; // Primeiro nome
    
    // Lógica da Taxa de Entrega
    const deliveryFeeText = (order.deliveryFee === 0 || !order.deliveryFee)
        ? `CORTESIA ${EMOJI.GIFT}`
        : formatCurrency(order.deliveryFee);

    // Formata a lista de itens removendo separadores visuais
    const itemsFormatted = order.items
        .split('\n')
        .filter((line: string) => line.trim() !== '' && !line.includes('---'))
        .map((line: string) => {
            const cleanLine = line.trim();
            if (cleanLine.toLowerCase().startsWith('obs:')) return `   _(${cleanLine})_`; 
            
            // Tenta detectar padrão "1x Item" para deixar "Item" em negrito
            const match = cleanLine.match(/^(\d+)[xX\s]+(.+)/);
            if (match) {
                return `▪️ ${match[1]}x *${match[2].trim()}*`;
            }
            return `▪️ ${cleanLine}`;
        })
        .join('\n');

    let message = `Olá *${customerName}*! Tudo bem? ${EMOJI.SMILE_HEARTS}\n`;
    message += `Que alegria ter você por aqui! Recebemos seu pedido no *${safeName}* com muito carinho! ${EMOJI.HEART}\n\n`;
    message += `*PEDIDO ${displayId}*\n\n`;
    message += `*${EMOJI.WRITE} O que vamos preparar para você:*\n${itemsFormatted}\n\n`;
    message += `*${EMOJI.SCOOTER} Taxa de entrega:* ${deliveryFeeText}\n`;
    message += `*${EMOJI.MONEY_BAG} Total:* ${formatCurrency(order.value)}\n`;
    message += `*💳 Pagamento:* *${order.paymentMethod || 'Dinheiro'}*\n`;
    message += `*⏳ Tempo estimado:* ${estimatedTime || '40-45 min'}\n\n`;

    message += `Seu pedido já foi enviado para a cozinha. Agora é só aguardar!\n`;
    message += `Assim que sair para entrega, eu te aviso por aqui. Obrigado pela preferência! ${EMOJI.BURGER}${EMOJI.HEART}\n\n`;

    if (isPix) {
        message += `*⚠️ Pagamento via PIX:*\n`;
        message += `Para facilitar, vou enviar o código *Copia e Cola* na próxima mensagem. É só **copiar e colar no app do seu banco** 👇`;
    }

    return message;
};

// --- HELPER PARA MENSAGEM SÓ COM CÓDIGO PIX (2ª Mensagem) ---
export const getPixCodeOnly = (pixKey: string, pixName: string, pixCity: string, value: number, orderId: string) => {
    return generatePixPayload(pixKey, pixName, pixCity, value, orderId);
};

export const sendOrderConfirmation = (order: any, appName: string, estimatedTime?: string) => {
    const safeName = appName || 'Jhans Burgers';
    const text = getOrderReceivedText(order, safeName, estimatedTime);
    const phone = normalizePhone(order.phone);
    if(phone) window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, 'whatsapp-session');
};

export const sendDeliveryNotification = (order: any, driverName: string, vehicle: string) => {
    const phone = normalizePhone(order.phone);
    if (!phone) return;
    const text = `Olá *${order.customer}*! ${EMOJI.SCOOTER}${EMOJI.DASH}\n*Boas notícias!*\nSeu pedido saiu para entrega e está a caminho.\n\nEntregador: *${driverName}*\nVeículo: *${vehicle}*\n\nObrigado pela preferência e bom apetite! ${EMOJI.BURGER}${EMOJI.HEART}`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, 'whatsapp-session');
};

export const getDispatchMessage = (order: any, driverName: string, appName: string) => {
    const safeName = appName || 'Jhans Burgers';
    const displayId = formatOrderId(order.id);
    return `Olá *${order.customer}*! ${EMOJI.WAVE}\n\nO seu pedido *${displayId}* ficou pronto aqui no *${safeName}* e já entregamos ao motoboy *${driverName}*! ${EMOJI.SCOOTER}${EMOJI.DASH}\n\nEle já saiu para entrega e logo chega no seu endereço.\n\nObrigado! ${EMOJI.HEART}`;
};

export const getProductionMessage = (order: any, appName: string) => {
    const safeName = appName || 'Jhans Burgers';
    const displayId = formatOrderId(order.id);
    return `Olá *${order.customer}*! ${EMOJI.WAVE}\n\nBoas notícias! O seu pedido *${displayId}* foi ACEITO e já começou a ser preparado aqui no *${safeName}*! ${EMOJI.CHEF}${EMOJI.FIRE}\n\nAvisaremos assim que ele sair para entrega.\n\nObrigado! ${EMOJI.HEART}`;
};

export const sendDispatchNotification = (order: any, driverName: string, appName: string) => {
    const safeName = appName || 'Jhans Burgers';
    const phone = normalizePhone(order.phone);
    if (!phone) return;
    const text = getDispatchMessage(order, driverName, safeName);
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, 'whatsapp-session');
};

// --- VALIDAÇÃO DE HORÁRIO APRIMORADA ---
export const checkShopStatus = (schedule?: { [key: number]: any }) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Se não houver schedule ou estiver vazio, assumimos aberto
    if (!schedule || Object.keys(schedule).length === 0) {
        return { 
            isOpen: true, 
            message: 'Horário não configurado', 
            nextOpen: null,
            nextOpenDay: null,
            nextOpenTime: null
        };
    }

    const todayConfig = schedule[currentDay];

    // Verificar se está aberto HOJE agora
    let isOpenToday = false;
    if (todayConfig && todayConfig.enabled && todayConfig.open && todayConfig.close) {
        const [openH, openM] = todayConfig.open.split(':').map(Number);
        const [closeH, closeM] = todayConfig.close.split(':').map(Number);
        
        const openTime = (openH || 0) * 60 + (openM || 0);
        const closeTime = (closeH || 0) * 60 + (closeM || 0);
        
        if (closeTime < openTime) {
            // Horário cruza meia-noite (ex: 18:00 as 02:00)
            isOpenToday = currentTime >= openTime || currentTime < closeTime;
        } else {
            // Horário normal (ex: 18:00 as 23:00)
            isOpenToday = currentTime >= openTime && currentTime < closeTime;
        }
    }

    if (isOpenToday) {
        return { isOpen: true, message: `Aberto até ${todayConfig.close}`, nextOpen: null, nextOpenDay: null, nextOpenTime: null };
    }

    // Se fechado, encontrar o PRÓXIMO horário de abertura
    let nextOpen = null;
    let nextDayName = '';
    
    // 1. Tentar ainda hoje (se fechou mas vai abrir mais tarde, ou se ainda não abriu)
    if (todayConfig && todayConfig.enabled && todayConfig.open) {
        const [openH, openM] = todayConfig.open.split(':').map(Number);
        const openTime = (openH || 0) * 60 + (openM || 0);
        if (currentTime < openTime) {
            nextOpen = todayConfig.open;
            nextDayName = 'Hoje';
        }
    }

    // 2. Se não encontrou hoje, procurar nos próximos 7 dias
    if (!nextOpen) {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        for (let i = 1; i <= 7; i++) {
            const nextDayIndex = (currentDay + i) % 7;
            const nextConfig = schedule[nextDayIndex];
            if (nextConfig && nextConfig.enabled && nextConfig.open) {
                nextOpen = nextConfig.open;
                nextDayName = i === 1 ? 'Amanhã' : days[nextDayIndex];
                break;
            }
        }
    }

    const nextOpenString = nextOpen ? `${nextDayName} às ${nextOpen}` : 'Em breve';

    return { 
        isOpen: false, 
        message: 'Fechado',
        nextOpen: nextOpenString,
        nextOpenDay: nextDayName,
        nextOpenTime: nextOpen
    };
};

export const COUNTRY_CODES = [
    { code: "+244", country: "🇦🇴 AO" }, // Angola
    { code: "+54",  country: "🇦🇷 AR" }, // Argentina
    { code: "+61",  country: "🇦🇺 AU" }, // Austrália
    { code: "+32",  country: "🇧🇪 BE" }, // Bélgica
    { code: "+591", country: "🇧🇴 BO" }, // Bolívia
    { code: "+55",  country: "🇧🇷 BR" }, // Brasil
    { code: "+1",   country: "🇨🇦 CA" }, // Canadá
    { code: "+41",  country: "🇨🇭 CH" }, // Suíça
    { code: "+56",  country: "🇨🇱 CL" }, // Chile
    { code: "+86",  country: "🇨🇳 CN" }, // China
    { code: "+57",  country: "🇨🇴 CO" }, // Colômbia
    { code: "+238", country: "🇨🇻 CV" }, // Cabo Verde
    { code: "+49",  country: "🇩🇪 DE" }, // Alemanha
    { code: "+34",  country: "🇪🇸 ES" }, // Espanha
    { code: "+33",  country: "🇫🇷 FR" }, // França
    { code: "+44",  country: "🇬🇧 GB" }, // Reino Unido
    { code: "+245", country: "🇬🇼 GW" }, // Guiné-Bissau
    { code: "+81",  country: "🇯🇵 JP" }, // Japão
    { code: "+82",  country: "🇰🇷 KR" }, // Coreia do Sul
    { code: "+52",  country: "🇲🇽 MX" }, // México
    { code: "+258", country: "🇲🇿 MZ" }, // Moçambique
    { code: "+51",  country: "🇵🇪 PE" }, // Peru
    { code: "+351", country: "🇵🇹 PT" }, // Portugal
    { code: "+595", country: "🇵🇾 PY" }, // Paraguai
    { code: "+7",   country: "🇷🇺 RU" }, // Rússia
    { code: "+239", country: "🇸🇹 ST" }, // São Tomé
    { code: "+670", country: "🇹🇱 TL" }, // Timor-Leste
    { code: "+1",   country: "🇺🇸 US" }, // EUA
    { code: "+598", country: "🇺🇾 UY" }, // Uruguai
    { code: "+58",  country: "🇻🇪 VE" }, // Venezuela
];
