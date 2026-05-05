import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  ChannelType,
  ActivityType,
} from "discord.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is not set");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("يدخل البوت قناة صوتية")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("اختر القناة الصوتية")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("يخرج البوت من القناة الصوتية")
    .toJSON(),
];

client.once("ready", async (c) => {
  console.log(`✅ البوت شغال: ${c.user.tag}`);

  c.user.setPresence({
    activities: [
      {
        name: "respect town",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/respecttown",
      },
    ],
    status: "online",
  });

  const rest = new REST({ version: "10" }).setToken(token!);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log("✅ تم تسجيل الأوامر بنجاح");
  } catch (error) {
    console.error("خطأ في تسجيل الأوامر:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "join") {
    await handleJoin(interaction as ChatInputCommandInteraction);
  } else if (interaction.commandName === "leave") {
    await handleLeave(interaction as ChatInputCommandInteraction);
  }
});

async function handleJoin(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ هذا الأمر يشتغل بس داخل السيرفر.");
    return;
  }

  const channelOption = interaction.options.getChannel("channel") as VoiceChannel | null;

  let targetChannel: VoiceChannel | null = null;

  if (channelOption) {
    targetChannel = channelOption;
  } else {
    const member = interaction.member as GuildMember;
    const memberVoiceChannel = member.voice.channel;
    if (memberVoiceChannel && memberVoiceChannel.type === ChannelType.GuildVoice) {
      targetChannel = memberVoiceChannel as VoiceChannel;
    }
  }

  if (!targetChannel) {
    await interaction.editReply(
      "❌ حدد قناة صوتية، أو ادخل أنت لقناة صوتية وأكتب الأمر."
    );
    return;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: targetChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    await interaction.editReply(`✅ دخلت القناة: **${targetChannel.name}**`);
  } catch (error) {
    console.error("خطأ عند الدخول للقناة:", error);
    await interaction.editReply("❌ ما قدرت أدخل القناة، تأكد أن البوت عنده صلاحية الدخول.");
  }
}

async function handleLeave(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ هذا الأمر يشتغل بس داخل السيرفر.");
    return;
  }

  const { getVoiceConnection } = await import("@discordjs/voice");
  const connection = getVoiceConnection(guild.id);

  if (!connection) {
    await interaction.editReply("❌ البوت مو موجود في أي قناة صوتية.");
    return;
  }

  connection.destroy();
  await interaction.editReply("✅ خرجت من القناة الصوتية.");
}

client.login(token);
