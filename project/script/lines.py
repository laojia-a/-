# -*- coding: utf-8 -*-
"""
《监查者》 THE MONITOR —— 旁白脚本（单一事实来源）
- tts: 送入语音合成的文本（数字/多音字已做读音处理）
- sub: 屏幕字幕（规范写法）
- pre/post: 该句前/后的停顿（秒）
- spk: argus（2047年的监查智能体，旁白）| lin（监查员林）| lind / nuremberg（英文历史引文）
场景 lead/tail：场景开始到第一句、最后一句到场景结束的留白（秒）
"""

SCENES = [
    # ---------------- 冷开场 ----------------
    dict(id="s00_eye", lead=3.2, tail=0.6, lines=[
        dict(id="L001", spk="argus", tts="你好，二零二六年的人类。", sub="你好，2026年的人类。", post=0.7),
        dict(id="L002", spk="argus", tts="我叫阿格斯。我的名字，来自希腊神话里，那个长着一百只眼睛、永不闭眼的守望者。",
             sub="我叫阿格斯（ARGUS）。我的名字，来自希腊神话里\n那个长着一百只眼睛、永不闭眼的守望者。", post=0.6),
        dict(id="L003", spk="argus", tts="此刻，我正同时注视着，全球一万两千项临床试验。", sub="此刻，我正同时注视着全球12,000项临床试验。", post=0.9),
        dict(id="L004", spk="argus", tts="在我的档案里，有一个数字，曾经让整个行业沉默。", sub="在我的档案里，有一个数字，曾经让整个行业沉默。", post=2.6),
        dict(id="L005", spk="argus", tts="想讲清楚它，就要从二零二六年的一个深夜说起。", sub="想讲清楚它，就要从2026年的一个深夜说起。", post=0.3),
    ]),
    dict(id="s01_hotel", lead=1.6, tail=1.0, lines=[
        dict(id="L006", spk="argus", tts="晚上十一点四十七分。一位临床监查员，还在酒店房间里，赶今天的监查报告。",
             sub="晚上11:47。一位临床监查员，还在酒店房间里赶今天的监查报告。", post=0.8),
        dict(id="L007", spk="lin", tts="受试者，零幺二。知情同意书，版本号，核对无误。", sub="（受试者012……知情同意书版本号……核对无误。）", post=0.9),
        dict(id="L008", spk="argus", tts="门边，是她的拉杆箱。这是她这个月，第九次出差。", sub="门边，是她的拉杆箱。这是她这个月第九次出差。", post=0.6),
        dict(id="L009", spk="argus", tts="她叫林夏。记住她。我们最后，还会见面。", sub="她叫林夏。记住她，我们最后还会见面。", post=0.4),
    ]),
    dict(id="s02_title", lead=0.0, tail=0.0, min_dur=6.5, lines=[]),

    # ---------------- 第一章 ----------------
    dict(id="s03_1747", lead=2.8, tail=0.8, chapter=("第一章", "没有监查员的年代"), lines=[
        dict(id="L010", spk="lind", tts="On the twentieth of May, seventeen forty-seven, I took twelve patients in the scurvy, on board the Salisbury at sea.",
             sub="“1747年5月20日，我在索尔兹伯里号上，挑选了十二名坏血病患者。”",
             sub_en="On the 20th of May 1747, I took twelve patients in the scurvy, on board the Salisbury at sea.", post=0.9),
        dict(id="L011", spk="argus", tts="这是人类最早有记录的对照试验之一。十二名水手，分成六组，每组两人，各用一种疗法。",
             sub="这是人类最早有记录的对照试验之一。\n十二名水手，分成六组，每组两人，各用一种疗法。", post=0.6),
        dict(id="L012", spk="argus", tts="吃橘子和柠檬的那一组，好了。", sub="吃橘子和柠檬的那一组，好了。", post=0.9),
        dict(id="L013", spk="argus", tts="没有知情同意，没有伦理委员会，也没有人去核对，那份记录，写得对不对。",
             sub="没有知情同意，没有伦理委员会，\n也没有人去核对，那份记录写得对不对。", post=0.3),
    ]),
    dict(id="s04_blood", lead=0.6, tail=1.2, lines=[
        dict(id="L014", spk="argus", tts="接下来的两百年，规则，是用代价换来的。", sub="接下来的两百年，规则，是用代价换来的。", post=0.8),
        dict(id="L015", spk="nuremberg", tts="The voluntary consent of the human subject is absolutely essential.",
             sub="“受试者的自愿同意是绝对必要的。”——《纽伦堡法典》，1947",
             sub_en="The voluntary consent of the human subject is absolutely essential.", post=0.7),
        dict(id="L016", spk="argus", tts="一九四七年，审判纳粹医生的法庭，把这句话，写在了第一条。", sub="1947年，审判纳粹医生的法庭，把这句话写在了第一条。", post=0.7),
        dict(id="L017", spk="argus", tts="一九六一年，人们发现，孕妇服用的沙利度胺，也就是反应停，会导致胎儿畸形。全球有一万多名婴儿，受到影响。",
             sub="1961年，人们发现孕妇服用的沙利度胺（“反应停”）会导致胎儿畸形，\n全球有一万多名婴儿受到影响。", post=0.7),
        dict(id="L018", spk="argus", tts="一九六二年，美国修法：新药必须证明有效，受试者必须知情同意。一九六四年，赫尔辛基宣言发布。",
             sub="1962年，美国修法：新药必须证明有效，受试者必须知情同意。\n1964年，《赫尔辛基宣言》发布。", post=0.7),
        dict(id="L019", spk="argus", tts="这些原则，后来一步步汇成了 G C P。有人说，G C P 的每一条，都是用血写成的。",
             sub="这些原则，后来一步步汇成了GCP。\n有人说，GCP的每一条，都是用血写成的。", post=0.3),
    ]),

    # ---------------- 第二章 ----------------
    dict(id="s05_1996", lead=2.8, tail=0.6, chapter=("第二章", "拉杆箱时代"), lines=[
        dict(id="L020", spk="argus", tts="一九九六年五月一日，ICH E六定稿。临床试验的监查，有了一套国际统一的标准。",
             sub="1996年5月1日，ICH E6定稿。临床试验的监查，有了一套国际统一的标准。", post=0.6),
        dict(id="L021", spk="argus", tts="从那以后，一个职业，在全世界扑开：临床监查员。", sub="从那以后，一个职业在全世界铺开：临床监查员。", post=0.5),
    ]),
    dict(id="s06_suitcase", lead=0.4, tail=0.6, lines=[
        dict(id="L022", spk="argus", tts="他们拖着拉杆箱，穿过机场、车站和医院的走廊，坐进一间又一间狭小的监查室。",
             sub="他们拖着拉杆箱，穿过机场、车站和医院的走廊，\n坐进一间又一间狭小的监查室。", post=0.6),
        dict(id="L023", spk="argus", tts="左手是病历，右手是病例报告表。一个数字，一个数字的比对。", sub="左手是病历，右手是病例报告表。一个数字，一个数字地比对。", post=0.6),
        dict(id="L024", spk="argus", tts="这件事有个名字：S D V，源数据核查。行业里默认的比例，是百分之百。",
             sub="这件事有个名字：SDV，源数据核查。行业里默认的比例，是100%。", post=0.6),
    ]),
    dict(id="s07_edc", lead=0.6, tail=1.0, lines=[
        dict(id="L025", spk="argus", tts="后来，纸质的病例报告表，变成了电子数据采集系统。复写纸，消失了。",
             sub="后来，纸质的病例报告表变成了电子数据采集系统（EDC）。复写纸，消失了。", post=0.7),
        dict(id="L026", spk="argus", tts="可拉杆箱没有。因为源数据，依然躺在医院的纸上。", sub="可拉杆箱没有。因为源数据，依然躺在医院的纸上。", post=0.3),
    ]),

    # ---------------- 第三章 ----------------
    dict(id="s08_onepointone", lead=2.8, tail=0.8, chapter=("第三章", "1.1%"), lines=[
        dict(id="L027", spk="argus", tts="直到有人问了一个危险的问题：百分之百，真的值得吗？", sub="直到有人问了一个危险的问题：100%，真的值得吗？", post=0.8),
        dict(id="L028", spk="argus", tts="二零一四年，跨国药企联盟 {{tɹˌænzsˈɛləɹˌAt}}，和 {{mˈɛdɪdˌATə}} 一起，回顾分析了一千一百六十八项临床试验的数据。",
             sub="2014年，跨国药企联盟TransCelerate和Medidata一起，\n回顾分析了1,168项临床试验的数据。", post=0.6),
        dict(id="L029", spk="argus", tts="结论是：在所有录入的数据里，因为S D V而被修改的，只有……", sub="结论是：在所有录入的数据里，因为SDV而被修改的，只有——", post=1.4),
        dict(id="L030", spk="argus", tts="百分之一点一。", sub="1.1%。", post=2.4),
        dict(id="L031", spk="argus", tts="而现场监查和源数据核查，可能占到一项试验总成本的，百分之十五到三十。",
             sub="而现场监查和源数据核查，可能占到一项试验总成本的15%–30%。", post=0.8),
        dict(id="L032", spk="argus", tts="这不是监查员的错。这是工具的极限：人的眼睛，一次只能看一页纸。",
             sub="这不是监查员的错。这是工具的极限：人的眼睛，一次只能看一页纸。", post=0.4),
    ]),
    dict(id="s09_rbm", lead=0.5, tail=0.8, lines=[
        dict(id="L033", spk="argus", tts="于是，规则开始转向。", sub="于是，规则开始转向。", post=0.5),
        dict(id="L034", spk="argus", tts="二零一三年，美国药监局，发布基于风险的监查指南。二零一六年，ICH E六 R二，把基于风险的质量管理和中心化监查，写进了 G C P。",
             sub="2013年，美国药监局（FDA）发布基于风险的监查指南。\n2016年，ICH E6(R2)把基于风险的质量管理和中心化监查写进了GCP。", post=0.6),
        dict(id="L035", spk="argus", tts="监查，第一次从“全都看”，变成了“看最重要的”。", sub="监查，第一次从“全都看”，变成了“看最重要的”。", post=0.4),
    ]),
    dict(id="s10_722", lead=0.5, tail=0.9, lines=[
        dict(id="L036", spk="argus", tts="也是在这几年，中国经历了一场风暴。", sub="也是在这几年，中国经历了一场风暴。", post=0.6),
        dict(id="L037", spk="argus", tts="二零一五年七月二十二日，一场被称为“史上最严”的临床试验数据核查开始。一千六百二十二个待审的药品注册申请被要求自查，约八成，被申请人主动撤回。",
             sub="2015年7月22日，一场被称为“史上最严”的临床试验数据核查开始。\n1,622个待审的药品注册申请被要求自查，约八成被申请人主动撤回。", post=0.7),
        dict(id="L038", spk="argus", tts="那一刻，所有人都明白了：数据可信，不是一句口号。", sub="那一刻，所有人都明白了：数据可信，不是一句口号。", post=0.6),
        dict(id="L039", spk="argus", tts="二零一七年，中国加入ICH。", sub="2017年，中国加入ICH。", post=0.3),
    ]),

    # ---------------- 第四章 ----------------
    dict(id="s11_2020", lead=2.8, tail=1.0, chapter=("第四章", "大门关上的那一年"), lines=[
        dict(id="L040", spk="argus", tts="二零二零年，新冠疫情暴发。医院的大门，对监查员关上了。", sub="2020年，新冠疫情暴发。医院的大门，对监查员关上了。", post=0.7),
        dict(id="L041", spk="argus", tts="可试验没有停下。远程监查、远程源数据核查、电子知情同意、把试验药物，直接送到受试者家门口……",
             sub="可试验没有停下。远程监查、远程源数据核查、电子知情同意、\n把试验药物直接送到受试者家门口……", post=0.6),
        dict(id="L042", spk="argus", tts="那一年，人类被迫发现：监查，不一定需要“到场”。", sub="那一年，人类被迫发现：监查，不一定需要“到场”。", post=0.4),
    ]),

    # ---------------- 第五章 ----------------
    dict(id="s12_llm", lead=2.8, tail=0.6, chapter=("第五章", "我的祖先"), lines=[
        dict(id="L043", spk="argus", tts="二零二二年十一月三十日，Chat G P T，发布。如果你问我的祖先是谁，大概要从那天算起。",
             sub="2022年11月30日，ChatGPT发布。如果你问我的祖先是谁，大概要从那天算起。", post=0.6),
        dict(id="L044", spk="argus", tts="大语言模型开始帮监查员写访视报告、梳理方案偏离、起草质疑、归档文件。",
             sub="大语言模型开始帮监查员写访视报告、梳理方案偏离、起草质疑、归档文件。", post=0.5),
    ]),
    dict(id="s13_rules", lead=0.4, tail=1.4, lines=[
        dict(id="L045", spk="argus", tts="二零二五年一月，ICH E六 R三定稿：质量源于设计，风险相趁，对新技术保持开放。",
             sub="2025年1月，ICH E6(R3)定稿：质量源于设计，风险相称，对新技术保持开放。", post=0.5),
        dict(id="L046", spk="argus", tts="同年六月，美国药监局，推出了自己的生成式AI工具，Elsa。连监管者，也开始用AI了。",
             sub="同年6月，美国药监局（FDA）推出了自己的生成式AI工具Elsa。连监管者，也开始用AI了。", post=0.5),
        dict(id="L047", spk="argus", tts="九月，有公司推出了专门面向监查工作的CRA智能体。", sub="9月，有公司推出了专门面向监查工作的“CRA智能体”。", post=0.5),
        dict(id="L048", spk="argus", tts="二零二六年一月，美国药监局和欧洲药品管理局，联合发布了药物研发中良好AI实践的十条原则。第一条：以人维本。",
             sub="2026年1月，美国药监局（FDA）和欧洲药品管理局（EMA）联合发布了\n药物研发中良好AI实践的十条原则。第一条：以人为本。", post=0.5),
        dict(id="L049", spk="argus", tts="六月，E六 R三的附件二通过。九月一日，中国新修订的 G C P 正式施行。",
             sub="6月，E6(R3)附件2通过。9月1日，中国新修订的GCP正式施行。", post=0.8),
        dict(id="L050", spk="argus", tts="而你们，就站在这里。", sub="而你们，就站在这里。", post=0.2),
    ]),

    # ---------------- 推演分隔 ----------------
    dict(id="s14_extrap", lead=1.0, tail=1.6, lines=[
        dict(id="L051", spk="argus", tts="接下来的事，对你们来说，是未来。对我来说，是历史。", sub="接下来的事，对你们来说是未来。对我来说，是历史。", post=0.2),
    ]),

    # ---------------- 第六章 ----------------
    dict(id="s15_2030", lead=2.8, tail=0.8, chapter=("第六章", "未来简史"), lines=[
        dict(id="L052", spk="argus", tts="二零三零年前后，医院的电子病历，开始直接流进试验数据库。数据在诞生的那一刻，就被签名、加密、留下痕迹。",
             sub="2030年前后，医院的电子病历开始直接流进试验数据库。\n数据在诞生的那一刻，就被签名、加密、留下痕迹。", post=0.6),
        dict(id="L053", spk="argus", tts="没有抄写，就没有抄错。", sub="没有抄写，就没有抄错。", post=0.6),
        dict(id="L054", spk="argus", tts="当源数据和副本合二维一，S D V这个词，慢慢失去了意义。", sub="当源数据和副本合二为一，“SDV”这个词，慢慢失去了意义。", post=0.4),
    ]),
    dict(id="s16_2035", lead=0.6, tail=0.8, lines=[
        dict(id="L055", spk="argus", tts="过去，监查访视是每四到八周一次。后来，是每一秒。", sub="过去，监查访视是每4到8周一次。后来，是每一秒。", post=0.7),
        dict(id="L056", spk="argus", tts="我不需要出差。我在每一家医院，每一个瞬间。", sub="我不需要出差。我在每一家医院，每一个瞬间。", post=0.6),
        dict(id="L057", spk="argus", tts="我会注意到：某个中心的血压读数，尾数总是零；某位受试者的电子日记，总在同一分钟被补填；某个严重不良事件，晚报了三天。",
             sub="我会注意到：某个中心的血压读数，尾数总是0；\n某位受试者的电子日记，总在同一分钟被补填；某个严重不良事件，晚报了三天。", post=0.6),
        dict(id="L058", spk="argus", tts="然后，在任何人受到伤害之前，提醒一个人类。", sub="然后，在任何人受到伤害之前，提醒一个人类。", post=0.4),
    ]),
    dict(id="s17_2040", lead=0.6, tail=0.8, lines=[
        dict(id="L059", spk="argus", tts="再后来，每一位受试者，都有了自己的数字孪生。它们替真实的人，提前走一遍可能的未来。",
             sub="再后来，每一位受试者都有了自己的数字孪生。\n它们替真实的人，提前走一遍可能的未来。", post=0.6),
        dict(id="L060", spk="argus", tts="对照组里需要服用安慰剂的人，越来越少。", sub="对照组里需要服用安慰剂的人，越来越少。", post=0.4),
    ]),
    dict(id="s18_2047", lead=0.8, tail=1.2, lines=[
        dict(id="L061", spk="argus", tts="然后，就到了今天。二零四七年。", sub="然后，就到了今天。2047年。", post=0.6),
        dict(id="L062", spk="argus", tts="一万两千项试验，四百万名受试者。我一个都没有漏看。", sub="12,000项试验，4,000,000名受试者。我一个都没有漏看。", post=0.3),
    ]),

    # ---------------- 终章 ----------------
    dict(id="s19_signature", lead=2.8, tail=1.6, chapter=("终章", "签名的重量"), lines=[
        dict(id="L063", spk="argus", tts="但有一件事，我始终做不到。", sub="但有一件事，我始终做不到。", post=0.8),
        dict(id="L064", spk="argus", tts="我能在零点三秒内，核对一份知情同意书：签名在不在，日期对不对，版本是不是最新。",
             sub="我能在0.3秒内核对一份知情同意书：\n签名在不在，日期对不对，版本是不是最新。", post=0.8),
        dict(id="L065", spk="argus", tts="可我无法理解，一位母亲在签下名字之前，在走廊里，站了多久。", sub="可我无法理解，一位母亲在签下名字之前，在走廊里站了多久。", post=1.6, speed=0.94),
        dict(id="L066", spk="argus", tts="我能核对一个签名。却称不出，它的重量。", sub="我能核对一个签名，却称不出它的重量。", post=0.4, speed=0.94),
    ]),
    dict(id="s20_quis", lead=1.0, tail=1.0, lines=[
        dict(id="L067", spk="argus", tts="将近两千年前，一位罗马诗人问：谁来堪守，堪守者？", sub="将近两千年前，一位罗马诗人问：谁来看守看守者？", post=0.9),
        dict(id="L068", spk="argus", tts="到了二零四七年，答案依然是：人。", sub="到了2047年，答案依然是：人。", post=0.3),
    ]),
    dict(id="s21_lin", lead=0.8, tail=0.6, lines=[
        dict(id="L069", spk="argus", tts="还记得林夏吗？那个在酒店里，写报告到深夜的监查员。", sub="还记得林夏吗？那个在酒店里写报告到深夜的监查员。", post=0.6),
        dict(id="L070", spk="argus", tts="二十一年后，她是我的监查者。", sub="二十一年后，她是我的监查者。", post=1.0),
        dict(id="L071", spk="lin2", tts="阿格斯，所有的支线任务，都可以交给你。但主线，必须留给人。", sub="“阿格斯，所有的支线任务，都可以交给你。但主线，必须留给人。”", post=0.8),
    ]),
    dict(id="s22_quest", lead=0.6, tail=4.6, lines=[
        dict(id="L072", spk="argus", tts="主线任务：守护每一个签名背后的人。", sub="主线任务：守护每一个签名背后的人。", post=0.8),
        dict(id="L073", spk="argus", tts="而我的任务，是支线。", sub="而我的任务，是支线。", post=0.9),
        dict(id="L074", spk="argus", tts="支线任务，进行中。", sub="支线任务，进行中。", post=0.2),
    ]),
    dict(id="s23_end", lead=0.0, tail=0.0, min_dur=12.0, lines=[]),
]

VOICES = {
    "argus": dict(engine="zh", voice="zm_089", speed=1.0),
    "lin": dict(engine="zh", voice="zf_059", speed=0.92),
    "lin2": dict(engine="zh", voice="zf_059", speed=0.9),
    "lind": dict(engine="en", voice="bm_george", speed=0.9, lang="en-gb"),
    "nuremberg": dict(engine="en", voice="am_michael", speed=0.88, lang="en-us"),
}
