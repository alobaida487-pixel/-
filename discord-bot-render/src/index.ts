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
    .setDescription("يدخل البوت قناة صوتية محددة")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("اختر القناة الصوتية")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .toJSON(),
];

client.once("ready", async (c) => {
  console.log(`✅ البوت شغال: ${c.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(token!);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log("✅ تم تسجيل أمر /join بنجاح");
  } catch (error) {
    console.error("خطأ في تسجيل الأوامر:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "join") {
    await handleJoin(interaction as ChatInputCommandInteraction);
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
    const memberChannel = member.voice.channel;
    if (memberChannel && memberChannel.type === ChannelType.GuildVoice) {
      targetChannel = memberChannel as VoiceChannel;
    }
  }

  if (!targetChannel) {
    await interaction.editReply(
      "❌ حدد قناة صوتية من الخيار، أو ادخل أنت لقناة صوتية وأكتب الأمر."
    );
    return;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: targetChannel.id,
      guildId: guild.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapterCreator: guild.voiceAdapterCreator as any,
      selfDeaf: false,
      selfMute: true,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    await interaction.editReply(`✅ دخلت القناة: **${targetChannel.name}**`);
  } catch (error) {
    console.error("خطأ عند الدخول للقناة:", error);
    await interaction.editReply("❌ ما قدرت أدخل القناة، تأكد من صلاحيات البوت.");
  }
}

client.login(token);
