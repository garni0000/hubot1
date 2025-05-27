require('dotenv').config();
const http = require('http');
const { Telegraf, Markup } = require('telegraf');
const schedule = require('node-schedule');
const moment = require('moment');
require('moment-timezone');

// Configuration
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const ADMIN_ID = parseInt(process.env.TELEGRAM_ADMIN_ID);
const TIMEZONE = process.env.TIMEZONE || 'Europe/Paris';

moment.locale('fr');
moment.tz.setDefault(TIMEZONE);

// Heures d'envoi automatique (format 24h)
const SCHEDULE_HOURS = [9, 12, 15, 17, 19, 21, 23];

// Fonction pour calculer le temps restant
function getNextPredictionTime() {
    const now = moment();
    let nextPrediction = null;

    for (const hour of SCHEDULE_HOURS) {
        const predictionTime = moment().hour(hour).minute(0).second(0);
        if (predictionTime.isAfter(now)) {
            nextPrediction = predictionTime;
            break;
        }
    }

    if (!nextPrediction) {
        nextPrediction = moment().add(1, 'day').hour(SCHEDULE_HOURS[0]).minute(0).second(0);
    }

    const duration = moment.duration(nextPrediction.diff(now));
    const hours = duration.hours();
    const minutes = duration.minutes();

    return hours > 0 
        ? `dans ${hours}h${minutes > 0 ? ` et ${minutes}min` : ''}`
        : `dans ${minutes}min`;
}

function generatePrediction() {
    const fixedCodes = ["2.41", "1.93", "1.54", "1.23"];

    // Crée un objet avec les codes dans le bon ordre
    const appleLines = fixedCodes.map(code => {
        const applePos = Math.floor(Math.random() * 5);
        const line = Array.from({ length: 5 }, (_, i) => i === applePos ? '🍎' : '🟩').join(' ');
        return `${code}:${line}`;
    });

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.url('🔐 S\'inscrire ici', 'https://join.solkah.org/'),
            Markup.button.url('📘 Comment jouer', 'https://t.me/c/2035790146/11014')
        ]
    ]);

    return {
        text: `🎯 *NEW SIGNAL \ Apple of Fortune*
📊 *Tentative*  \:5

📌 *Position*  \ : 👇👇👇👇

${appleLines.map(line => line.replace(/\./g, '\.')).join('\n')}

\`\`\` 🎲Mais attention :cela fonctionne uniquement sur 👇👇👇\`\`\`
\`\`\`  👉 Linebet et 888starz👈avec le code promo ZFree221 ✅ \`\`\`

🕐 *Prochaine prévision* ${getNextPredictionTime()}\\. Active les notifs !`,
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard.reply_markup
    };
}


// Commande manuelle /send
bot.command('send', (ctx) => {
    if (ctx.from.id === ADMIN_ID) {
        const { text, reply_markup } = generatePrediction();
        bot.telegram.sendMessage(CHANNEL_ID, text, { 
            parse_mode: 'Markdown',
            reply_markup 
        })
        .then(() => ctx.reply('✅ Signal envoyé !'))
        .catch((e) => {
            console.error('Erreur d\'envoi:', e);
            ctx.reply('❌ Erreur d\'envoi');
        });
    } else {
        ctx.reply('⛔ Accès refusé');
    }
});

// Envois automatiques
SCHEDULE_HOURS.forEach(hour => {
    schedule.scheduleJob(`0 ${hour} * * *`, () => {
        const { text, reply_markup } = generatePrediction();
        bot.telegram.sendMessage(CHANNEL_ID, text, {
            parse_mode: 'Markdown',
            reply_markup
        }).catch(e => console.error(`Erreur à ${hour}h:`, e));
    });
    console.log(`✅ Prédiction programmée à ${hour}h`);
});

// Gestion des erreurs
bot.catch((err, ctx) => {
    console.error('Erreur du bot:', err);
    ctx?.reply('❌ Une erreur est survenue');
});

// Démarrage
bot.launch()
    .then(() => console.log(`🤖 Bot démarré pour le canal ${CHANNEL_ID}`))
    .catch(err => console.error('Échec du démarrage:', err));

// Arrêt propre
const shutdown = () => {
    schedule.gracefulShutdown()
        .then(() => bot.stop())
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Erreur lors de l\'arrêt:', err);
            process.exit(1);
        });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);




// Serveur HTTP de statut (port 8080)
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot en ligne');
  })
  .listen(8080, () => console.log('🌐 Serveur HTTP actif sur le port 8080'));
