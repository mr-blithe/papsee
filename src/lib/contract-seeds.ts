import type { PublishedContract } from './contracts'

export type ContractSeed = PublishedContract

const PUBLISHED_AT = new Date('2026-08-10T00:00:00.000Z')
const VERSION = '2026-08-10'

export const CONTRACT_SEEDS = [
  {
    type: 'privacy',
    locale: 'en',
    version: VERSION,
    title: 'Privacy policy',
    summary: 'How PapSee collects, uses, stores, shares and deletes account and PAP therapy data.',
    publishedAt: PUBLISHED_AT,
    contentHtml: `
      <p><strong>Effective date:</strong> 10 August 2026</p>
      <p>This policy applies when you visit PapSee, create an account, import PAP device files, use the therapy screens, or contact us. PapSee determines how the personal data described here is processed. You can send privacy requests through the <a href="/contact">contact page</a>.</p>

      <h2>Data we process</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, authentication records and, if you choose Google sign-in, identifiers supplied by Google.</li>
        <li><strong>Profile data:</strong> optional date of birth, height, weight, diagnosis date, diagnosis AHI and device guide selection.</li>
        <li><strong>Health and device data:</strong> files imported from your PAP device, device information, therapy settings, sessions, respiratory events, signal samples, derived indices, charts and statistics. This may be health data and special category personal data.</li>
        <li><strong>Sharing data:</strong> when you create a link to show your therapy data to someone else, we store a one-way hash of that link, the moment it stops working and the moment you created it. The link itself is never stored, so it cannot be shown to you again or recovered by us.</li>
        <li><strong>Contact data:</strong> your name, email address, selected topic, message and our correspondence with you.</li>
        <li><strong>Technical data:</strong> session and security records, IP address, request metadata, device and browser information, and service error records needed to operate and protect the service.</li>
      </ul>
      <p>We obtain this data from you, your browser, your chosen authentication provider and the PAP device files you decide to import. We do not obtain clinical records from healthcare providers.</p>

      <h2>Purposes and legal grounds</h2>
      <ul>
        <li>We process account and authentication data to create and secure your account and provide the service you request. The legal ground is performance of the service contract.</li>
        <li>We process imported PAP therapy data to parse, store and present your nights, history and reports. Because this can reveal health information, we rely on your explicit consent where required by the GDPR. Consent is voluntary and may be withdrawn at any time. Withdrawal does not affect processing already carried out lawfully.</li>
        <li>We process a share link so that whoever holds it can read the nights of the account that created it, on screen and without changing anything, for as long as that link works. Profile details such as name, date of birth, height, weight and diagnosis are not shown to them, and the link cannot download the history. The legal ground is performing the service you asked for, on your explicit instruction. You decide who receives the link and how long it lasts, and you can stop it at any time.</li>
        <li>We process technical and security data to prevent abuse, investigate faults and protect accounts and systems. The legal ground is our legitimate interest in operating a secure service, except where your rights and interests override that interest, and compliance with legal obligations where applicable.</li>
        <li>We process contact messages to answer your request. The legal ground is taking steps at your request, performing the service contract, or our legitimate interest in responding, depending on the subject.</li>
        <li>We process a small set of usage events to count how the service is used and to see where it fails. The legal ground is our legitimate interest in maintaining and improving the service, except where your rights and interests override that interest. Imported therapy data is never part of these events.</li>
        <li>We may retain or disclose limited data when necessary to comply with a binding legal duty, establish or defend legal claims, or protect a person's vital interests.</li>
      </ul>
      <p>We do not use your PAP therapy data for advertising, sell personal data, or make decisions that produce legal or similarly significant effects solely by automated processing.</p>

      <h2>Service providers and disclosures</h2>
      <p>Only providers that need data to perform a service for PapSee receive it. They process it under their own applicable terms and data protection obligations.</p>
      <ul>
        <li>Vercel hosts and runs the application in Frankfurt, Germany.</li>
        <li>Neon hosts the primary PostgreSQL database in Frankfurt, Germany.</li>
        <li>Google receives authentication requests only if you choose Google sign-in.</li>
        <li>PostHog processes product usage events on servers in the European Union.</li>
        <li>Cloudflare processes the contact form challenge used to prevent automated abuse, and routes the usage events described above to PostHog.</li>
        <li>The configured email provider processes contact messages sent through the contact form.</li>
        <li>Public authorities or other recipients may receive data only when disclosure is legally required or necessary to establish, exercise or defend legal claims.</li>
      </ul>
      <p>We do not make imported PAP files or therapy results public. A share link you create is the one way another person can read your nights, it discloses them to whoever holds the link, and choosing to send it is yours alone.</p>

      <h2>International transfers</h2>
      <p>The application and primary database are hosted in the European Union. Some providers may process limited account, security, authentication or contact data in other countries. When a transfer is subject to the GDPR, it must rely on a valid transfer mechanism, such as an adequacy decision, appropriate contractual safeguards, or explicit consent where that ground is legally available. You may ask for information about the safeguard relevant to your data through the contact page.</p>

      <h2>Retention and deletion</h2>
      <ul>
        <li>Account, profile and imported therapy data are kept while your account remains open, unless you delete an import or request account deletion earlier.</li>
        <li>Contact correspondence may be kept for up to two years after the request is closed so we can follow up and document the response.</li>
        <li>A share link record is kept until you stop it or it stops working, and expired records are removed the next time you create a link. Deleting your account removes them with everything else.</li>
        <li>Security and service logs are normally kept for up to 90 days unless a specific incident requires longer investigation.</li>
        <li>Data required by law or needed for a legal claim may be kept for the applicable statutory period.</li>
        <li>Deleted data may remain in encrypted, access-restricted backups until the backup rotation completes. It is not restored for ordinary use.</li>
      </ul>
      <p>When a retention period ends, data is deleted or irreversibly anonymised.</p>

      <h2>Cookies and local storage</h2>
      <p>PapSee uses storage necessary for sign-in, security, language, theme, panel preferences, demo mode and shared views. These features are needed to provide the service or remember a choice you made. Opening a share link sets a cookie in the reader's browser that holds the link and nothing else; it is not readable by scripts and it expires with the link.</p>
      <p>PapSee also sets a product analytics cookie, provided by PostHog, that counts pages opened and a short list of named actions: creating an account, signing in, finishing an import, opening the example patient and sending a contact message. Web addresses are stripped of their query and fragment before they leave your browser, so the date of a night you were reading is never sent. Clicks, form contents, keystrokes and screen recordings are not collected, and imported therapy data is never sent. PapSee does not use advertising cookies and does not build advertising or profiling audiences.</p>

      <h2>Security</h2>
      <p>We use access controls, encrypted network connections, account separation, restricted infrastructure locations and other technical and organisational measures appropriate to the data handled by the service. No internet service can guarantee absolute security. Keep your account credentials confidential and tell us promptly if you suspect unauthorised access.</p>

      <h2>Your rights</h2>
      <p>Depending on the law that applies to you, you may have the right to:</p>
      <ul>
        <li>learn whether your personal data is processed and obtain access to it;</li>
        <li>ask about the purpose, use, source, recipients and transfers of your data;</li>
        <li>correct inaccurate or incomplete data;</li>
        <li>request deletion, destruction, anonymisation or restriction of processing;</li>
        <li>receive eligible data in a portable format;</li>
        <li>object to processing based on legitimate interests or to an adverse result produced solely by automated analysis;</li>
        <li>withdraw consent at any time without affecting earlier lawful processing;</li>
        <li>request compensation where unlawful processing caused damage; and</li>
        <li>complain to the competent data protection authority in the European Economic Area.</li>
      </ul>
      <p>Submit a request through the <a href="/contact">contact page</a>. We may ask for information necessary to confirm your identity and protect the account. We aim to respond within one month under the GDPR, subject to any lawful extension. Requests are normally free, but the law may permit a reasonable fee or refusal for manifestly unfounded or excessive requests.</p>
      <p>You can also export or delete eligible account data through features made available in the service.</p>

      <h2>Children</h2>
      <p>PapSee is intended for adults. Do not create an account or import another person's health data unless you are legally authorised to do so.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy when the service, providers or legal requirements change. The current version and effective date appear on this page. If a change materially affects how existing health data is processed, we will provide appropriate notice and obtain new consent when the law requires it.</p>
    `,
  },
  {
    type: 'privacy',
    locale: 'tr',
    version: VERSION,
    title: 'Gizlilik politikası',
    summary: 'PapSee hesap ve PAP tedavi verilerini nasıl toplar, kullanır, saklar, paylaşır ve siler.',
    publishedAt: PUBLISHED_AT,
    contentHtml: `
      <p><strong>Yürürlük tarihi:</strong> 10 Ağustos 2026</p>
      <p>Bu politika PapSee'yi ziyaret ettiğinizde, hesap oluşturduğunuzda, PAP cihazı dosyalarını içe aktardığınızda, tedavi ekranlarını kullandığınızda veya bizimle iletişime geçtiğinizde uygulanır. PapSee, burada açıklanan kişisel verilerin nasıl işleneceğini belirler. Gizlilik taleplerinizi <a href="/tr/contact">iletişim sayfası</a> üzerinden iletebilirsiniz.</p>

      <h2>İşlediğimiz veriler</h2>
      <ul>
        <li><strong>Hesap verileri:</strong> ad, e-posta adresi, kimlik doğrulama kayıtları ve Google ile giriş yapmayı seçerseniz Google tarafından sağlanan tanımlayıcılar.</li>
        <li><strong>Profil verileri:</strong> isteğe bağlı doğum tarihi, boy, kilo, tanı tarihi, tanı AHI değeri ve cihaz rehberi seçimi.</li>
        <li><strong>Sağlık ve cihaz verileri:</strong> PAP cihazınızdan içe aktardığınız dosyalar, cihaz bilgileri, tedavi ayarları, kullanım aralıkları, solunum olayları, sinyal örnekleri, hesaplanan indeksler, grafikler ve istatistikler. Bunlar sağlık verisi ve özel nitelikli kişisel veri olabilir.</li>
        <li><strong>Paylaşım verileri:</strong> tedavi verilerinizi başka birine göstermek için bir bağlantı oluşturduğunuzda, bu bağlantının tek yönlü özetini, ne zaman çalışmayı bırakacağını ve ne zaman oluşturulduğunu saklarız. Bağlantının kendisi hiçbir zaman saklanmaz; bu nedenle size yeniden gösterilemez ve bizim tarafımızdan geri getirilemez.</li>
        <li><strong>İletişim verileri:</strong> adınız, e-posta adresiniz, seçtiğiniz konu, mesajınız ve sizinle yaptığımız yazışmalar.</li>
        <li><strong>Teknik veriler:</strong> hizmeti çalıştırmak ve korumak için gereken oturum ve güvenlik kayıtları, IP adresi, istek bilgileri, cihaz ve tarayıcı bilgileri ile hizmet hata kayıtları.</li>
      </ul>
      <p>Bu verileri sizden, tarayıcınızdan, seçtiğiniz kimlik doğrulama sağlayıcısından ve içe aktarmaya karar verdiğiniz PAP cihazı dosyalarından elde ederiz. Sağlık hizmeti sunucularından klinik kayıt almayız.</p>

      <h2>Amaçlar ve hukuki sebepler</h2>
      <ul>
        <li>Hesabınızı oluşturmak, güvenliğini sağlamak ve talep ettiğiniz hizmeti sunmak için hesap ve kimlik doğrulama verilerini işleriz. Hukuki sebep hizmet sözleşmesinin kurulması ve ifasıdır.</li>
        <li>Gecelerinizi, geçmişinizi ve raporlarınızı ayrıştırmak, saklamak ve göstermek için içe aktarılan PAP tedavi verilerini işleriz. Bu veriler sağlık bilgisi açıklayabildiği için GDPR ve KVKK'nın gerekli kıldığı durumlarda açık rızanıza dayanırız. Rıza isteğe bağlıdır ve her zaman geri alınabilir. Rızanın geri alınması, daha önce hukuka uygun olarak yapılan işlemleri etkilemez.</li>
        <li>Bir paylaşım bağlantısını, bağlantı çalıştığı sürece onu elinde tutan kişinin bağlantıyı oluşturan hesabın gecelerini ekranda ve hiçbir şeyi değiştirmeden okuyabilmesi için işleriz. Ad, doğum tarihi, boy, kilo ve tanı gibi profil bilgileri bu kişiye gösterilmez ve bağlantı geçmişi indiremez. Hukuki sebep, açık talimatınız üzerine istediğiniz hizmetin sunulmasıdır. Bağlantıyı kimin alacağına ve ne kadar süre çalışacağına siz karar verirsiniz ve dilediğiniz zaman durdurabilirsiniz.</li>
        <li>Kötüye kullanımı önlemek, hataları incelemek ve hesaplar ile sistemleri korumak için teknik ve güvenlik verilerini işleriz. Hukuki sebep, hak ve menfaatlerinizin üstün gelmediği ölçüde güvenli bir hizmet işletmeye yönelik meşru menfaatimiz ve uygulanabildiği durumlarda hukuki yükümlülüklerimizdir.</li>
        <li>Talebinizi yanıtlamak için iletişim mesajlarını işleriz. Konuya göre hukuki sebep talebiniz üzerine işlem yapılması, hizmet sözleşmesinin ifası veya yanıt vermeye yönelik meşru menfaatimizdir.</li>
        <li>Hizmetin ne kadar kullanıldığını saymak ve nerede hata verdiğini görmek için az sayıda kullanım olayını işleriz. Hukuki sebep, hak ve menfaatlerinizin üstün gelmediği ölçüde hizmeti sürdürmeye ve geliştirmeye yönelik meşru menfaatimizdir. İçe aktarılan tedavi verileri bu olayların hiçbir parçası değildir.</li>
        <li>Bağlayıcı bir hukuki yükümlülüğe uymak, hukuki talepleri oluşturmak veya savunmak ya da bir kişinin hayati menfaatlerini korumak gerektiğinde sınırlı verileri saklayabilir veya açıklayabiliriz.</li>
      </ul>
      <p>PAP tedavi verilerinizi reklam amacıyla kullanmayız, kişisel veri satmayız ve yalnızca otomatik işleme dayanan hukuki veya benzer ölçüde önemli kararlar vermeyiz.</p>

      <h2>Hizmet sağlayıcılar ve aktarımlar</h2>
      <p>Yalnızca PapSee adına bir hizmet sunmak için veriye ihtiyaç duyan sağlayıcılar veri alır. Bu sağlayıcılar kendi geçerli koşulları ve veri koruma yükümlülükleri kapsamında işlem yapar.</p>
      <ul>
        <li>Vercel, uygulamayı Almanya'nın Frankfurt şehrinde barındırır ve çalıştırır.</li>
        <li>Neon, birincil PostgreSQL veritabanını Almanya'nın Frankfurt şehrinde barındırır.</li>
        <li>Google, yalnızca Google ile giriş yapmayı seçerseniz kimlik doğrulama isteklerini alır.</li>
        <li>PostHog, ürün kullanım olaylarını Avrupa Birliği'ndeki sunucularda işler.</li>
        <li>Cloudflare, otomatik kötüye kullanımı önlemek için iletişim formundaki doğrulama işlemini yürütür ve yukarıda anlatılan kullanım olaylarını PostHog'a yönlendirir.</li>
        <li>Yapılandırılmış e-posta sağlayıcısı, iletişim formu üzerinden gönderilen mesajları işler.</li>
        <li>Kamu kurumları veya diğer alıcılar yalnızca açıklamanın hukuken zorunlu olduğu ya da hukuki taleplerin oluşturulması, kullanılması veya savunulması için gerektiği durumlarda veri alabilir.</li>
      </ul>
      <p>İçe aktarılan PAP dosyalarını veya tedavi sonuçlarını herkese açık hâle getirmeyiz. Oluşturduğunuz paylaşım bağlantısı, başka bir kişinin gecelerinizi okuyabilmesinin tek yoludur; bu geceler bağlantıyı elinde tutan kişiye açıklanır ve bağlantıyı gönderme kararı yalnızca size aittir.</p>

      <h2>Yurt dışına veri aktarımı</h2>
      <p>Uygulama ve birincil veritabanı Avrupa Birliği'nde barındırılır. Bazı sağlayıcılar sınırlı hesap, güvenlik, kimlik doğrulama veya iletişim verilerini başka ülkelerde işleyebilir. GDPR veya KVKK kapsamındaki bir aktarım, yeterlilik kararı, uygun sözleşmesel güvence veya bu hukuki sebebin kullanılabildiği durumlarda açık rıza gibi geçerli bir aktarım mekanizmasına dayanmalıdır. Verilerinize uygulanan güvence hakkında iletişim sayfasından bilgi isteyebilirsiniz.</p>

      <h2>Saklama ve silme</h2>
      <ul>
        <li>Hesap, profil ve içe aktarılan tedavi verileri, bir içe aktarımı silmediğiniz veya daha erken hesap silme talebinde bulunmadığınız sürece hesabınız açıkken saklanır.</li>
        <li>İletişim yazışmaları, takip yapabilmek ve yanıtı belgelemek için talep kapatıldıktan sonra en fazla iki yıl saklanabilir.</li>
        <li>Paylaşım bağlantısı kaydı, siz durdurana veya bağlantı çalışmayı bırakana kadar saklanır; süresi dolmuş kayıtlar yeni bir bağlantı oluşturduğunuzda silinir. Hesabınızı sildiğinizde diğer her şeyle birlikte kaldırılır.</li>
        <li>Güvenlik ve hizmet kayıtları, belirli bir olay daha uzun inceleme gerektirmedikçe normalde en fazla 90 gün saklanır.</li>
        <li>Kanunen saklanması gereken veya hukuki bir talep için gerekli veriler, geçerli kanuni süre boyunca saklanabilir.</li>
        <li>Silinen veriler, yedekleme döngüsü tamamlanana kadar şifreli ve erişimi kısıtlı yedeklerde kalabilir. Olağan kullanım için geri yüklenmez.</li>
      </ul>
      <p>Saklama süresi sona erdiğinde veriler silinir veya geri döndürülemeyecek biçimde anonimleştirilir.</p>

      <h2>Çerezler ve yerel depolama</h2>
      <p>PapSee giriş, güvenlik, dil, tema, panel tercihleri, demo modu ve paylaşılan görünümler için gerekli depolama araçlarını kullanır. Bunlar hizmeti sunmak veya yaptığınız bir seçimi hatırlamak için gereklidir. Bir paylaşım bağlantısını açmak, okuyan kişinin tarayıcısında yalnızca bağlantıyı tutan bir çerez oluşturur; bu çerez betikler tarafından okunamaz ve bağlantıyla birlikte sona erer.</p>
      <p>PapSee ayrıca PostHog tarafından sağlanan bir ürün analitiği çerezi kullanır. Bu çerez, açılan sayfaları ve adı belirli birkaç işlemi sayar: hesap oluşturma, giriş yapma, içe aktarımı tamamlama, örnek hastayı açma ve iletişim mesajı gönderme. Web adresleri tarayıcınızdan çıkmadan önce sorgu ve parça bölümlerinden arındırılır, böylece okuduğunuz gecenin tarihi hiçbir zaman gönderilmez. Tıklamalar, form içerikleri, tuş vuruşları ve ekran kayıtları toplanmaz; içe aktarılan tedavi verileri hiçbir zaman gönderilmez. PapSee reklam çerezi kullanmaz ve reklam veya profilleme kitleleri oluşturmaz.</p>

      <h2>Güvenlik</h2>
      <p>Hizmetin işlediği verilere uygun erişim kontrolleri, şifreli ağ bağlantıları, hesap ayrımı, sınırlandırılmış altyapı konumları ve diğer teknik ve idari tedbirleri uygularız. Hiçbir internet hizmeti mutlak güvenlik garanti edemez. Hesap bilgilerinizi gizli tutun ve yetkisiz erişimden şüphelenirseniz bize gecikmeden bildirin.</p>

      <h2>Haklarınız</h2>
      <p>Size uygulanan mevzuata göre şu haklara sahip olabilirsiniz:</p>
      <ul>
        <li>kişisel verilerinizin işlenip işlenmediğini öğrenme ve verilere erişme;</li>
        <li>işleme amacı, kullanım, kaynak, alıcılar ve aktarımlar hakkında bilgi isteme;</li>
        <li>yanlış veya eksik verilerin düzeltilmesini isteme;</li>
        <li>verilerin silinmesini, yok edilmesini, anonimleştirilmesini veya işlemenin kısıtlanmasını isteme;</li>
        <li>uygun verileri taşınabilir bir biçimde alma;</li>
        <li>meşru menfaate dayalı işlemeye veya yalnızca otomatik analiz sonucunda aleyhinize çıkan bir sonuca itiraz etme;</li>
        <li>daha önceki hukuka uygun işlemleri etkilemeden rızayı her zaman geri alma;</li>
        <li>hukuka aykırı işleme nedeniyle zarara uğramanız hâlinde tazminat isteme; ve</li>
        <li>Kişisel Verileri Koruma Kurumuna veya Avrupa Ekonomik Alanı'ndaki yetkili veri koruma makamına şikâyette bulunma.</li>
      </ul>
      <p>Talebinizi <a href="/tr/contact">iletişim sayfası</a> üzerinden gönderin. Kimliğinizi doğrulamak ve hesabı korumak için gerekli bilgileri isteyebiliriz. KVKK kapsamında 30 gün, GDPR kapsamında bir ay içinde yanıt vermeyi hedefleriz. Kanuni uzatma hakları saklıdır. Talepler normalde ücretsizdir, ancak açıkça temelsiz veya aşırı talepler için mevzuat makul bir ücret alınmasına ya da talebin reddedilmesine izin verebilir.</p>
      <p>Hizmette sunulan araçlar üzerinden uygun hesap verilerini dışa aktarabilir veya silebilirsiniz.</p>

      <h2>Çocuklar</h2>
      <p>PapSee yetişkinlere yöneliktir. Hukuken yetkili olmadığınız sürece başka bir kişi adına hesap oluşturmayın veya o kişinin sağlık verilerini içe aktarmayın.</p>

      <h2>Bu politikadaki değişiklikler</h2>
      <p>Hizmet, sağlayıcılar veya hukuki gereklilikler değiştiğinde bu politikayı güncelleyebiliriz. Geçerli sürüm ve yürürlük tarihi bu sayfada yer alır. Bir değişiklik mevcut sağlık verilerinin işlenmesini önemli ölçüde etkilerse uygun bildirimde bulunur ve kanunun gerektirdiği durumlarda yeniden rıza alırız.</p>
    `,
  },
  {
    type: 'terms',
    locale: 'en',
    version: VERSION,
    title: 'Terms of service',
    summary: 'The rules for using PapSee and the limits of a personal PAP therapy data service.',
    publishedAt: PUBLISHED_AT,
    contentHtml: `
      <p><strong>Effective date:</strong> 10 August 2026</p>
      <p>These terms govern your access to and use of PapSee. By creating an account or using the service, you agree to these terms and the <a href="/privacy">privacy policy</a>. If you do not agree, do not use the service.</p>

      <h2>Eligibility</h2>
      <p>You must be at least 18 years old and legally capable of entering into these terms. You may use PapSee for another person only if you are legally authorised to manage that person's data and treatment information.</p>

      <h2>The service</h2>
      <p>PapSee lets you import compatible PAP device files and view derived charts, event indices, settings and statistics. Device support and features may change as the service develops. Features identified as beta may be incomplete or change without notice.</p>
      <p>Unless a paid plan is expressly offered and accepted, access is provided without a subscription fee. Nothing in these terms requires PapSee to introduce or continue any particular feature.</p>

      <h2>Not medical advice</h2>
      <p>PapSee is an informational tool for viewing data recorded by a PAP device. It is not a medical device, healthcare provider, diagnosis, prescription or substitute for professional medical advice. Device-generated events and PapSee calculations may be incomplete or inaccurate. Do not start, stop or change treatment solely because of information shown by PapSee.</p>
      <p>Contact a qualified healthcare professional about symptoms, treatment settings or clinical decisions. In an emergency, contact local emergency services immediately. Do not use PapSee to request urgent help.</p>

      <h2>Your account</h2>
      <p>Provide accurate account information, keep your credentials confidential and promptly report suspected unauthorised access. You are responsible for activity performed through your account unless applicable law provides otherwise. Do not share an account in a way that exposes another person's health data.</p>

      <h2>Your data</h2>
      <p>You retain your rights in files and information you upload. You grant PapSee a limited, non-exclusive right to host, copy, parse, transform and display that data only as needed to operate, secure and improve the service for you.</p>
      <p>You confirm that you have the right to upload the data and that doing so does not violate another person's privacy, confidentiality or intellectual property rights. You are responsible for keeping any original device files or other backup you need.</p>

      <h2>Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>access another person's account or data without legal authority;</li>
        <li>probe, bypass or disrupt authentication, security, rate limits or service infrastructure;</li>
        <li>upload malicious code, intentionally corrupted material or content that infringes another person's rights;</li>
        <li>use the service unlawfully, fraudulently or to make medical decisions for others while misrepresenting PapSee as clinical advice; or</li>
        <li>resell, scrape or systematically reproduce the service except where mandatory law permits it.</li>
      </ul>

      <h2>PapSee materials</h2>
      <p>The service, interface, branding and software are protected by applicable intellectual property laws. These terms give you only the limited right to use the service. They do not transfer ownership of PapSee materials or restrict rights that cannot lawfully be restricted.</p>

      <h2>Third-party services</h2>
      <p>PapSee may depend on hosting, database, authentication, anti-abuse and email providers. Their outages or changes can affect the service. If you choose a third-party sign-in method, that provider's terms and privacy practices also apply to its processing.</p>

      <h2>Availability and changes</h2>
      <p>We aim to keep PapSee available, but uninterrupted or error-free operation is not guaranteed. Maintenance, security incidents, provider failures or changes in law may suspend part or all of the service. We may add, change or remove features when reasonably necessary, taking account of your interests and applicable consumer law.</p>

      <h2>Suspension, termination and deletion</h2>
      <p>You may stop using PapSee and request deletion of your account. We may restrict or suspend access when reasonably necessary to protect users or systems, comply with law, investigate a material breach, or prevent misuse. Where practical and lawful, we will provide notice and an opportunity to remedy the issue before permanent termination.</p>
      <p>After termination, your right to use the service ends. Data is handled under the privacy policy and any legal retention duty. Provisions that by their nature should survive, including ownership, liability, disputes and accrued rights, remain effective.</p>

      <h2>Disclaimers</h2>
      <p>To the extent permitted by law, PapSee is provided as available and without warranties beyond those that cannot legally be excluded. You remain responsible for checking important results against the original device data and obtaining professional advice where appropriate.</p>

      <h2>Liability</h2>
      <p>To the extent permitted by law, PapSee is not liable for indirect, incidental or consequential loss caused by reliance on device-generated information, loss of access, third-party services or failure to keep your own copy of imported files. Nothing in these terms excludes or limits liability that cannot legally be excluded, including liability for fraud, wilful misconduct, gross negligence, death or personal injury where applicable.</p>
      <p>Your mandatory consumer rights remain unaffected. Any limitation is applied only to the maximum extent allowed in your jurisdiction.</p>

      <h2>Governing law and disputes</h2>
      <p>These terms are governed by the laws of the Republic of Türkiye, without removing any mandatory protection granted to you by the law of your country of residence. Courts and consumer dispute bodies that have mandatory jurisdiction remain available to you.</p>
      <p>Before starting formal proceedings, you may contact us through the <a href="/contact">contact page</a> so the issue can be reviewed.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms to reflect service, legal or security changes. The current version and effective date appear on this page. We will give reasonable notice of material changes where required. If the change requires new agreement under applicable law, continued use alone will not replace that required agreement.</p>

      <h2>Contact</h2>
      <p>Questions, notices and account requests can be sent through the <a href="/contact">contact page</a>.</p>
    `,
  },
  {
    type: 'terms',
    locale: 'tr',
    version: VERSION,
    title: 'Kullanım koşulları',
    summary: 'PapSee kullanım kuralları ve kişisel PAP tedavi verisi hizmetinin sınırları.',
    publishedAt: PUBLISHED_AT,
    contentHtml: `
      <p><strong>Yürürlük tarihi:</strong> 10 Ağustos 2026</p>
      <p>Bu koşullar PapSee'ye erişiminizi ve PapSee kullanımınızı düzenler. Hesap oluşturarak veya hizmeti kullanarak bu koşulları ve <a href="/tr/privacy">gizlilik politikasını</a> kabul edersiniz. Kabul etmiyorsanız hizmeti kullanmayın.</p>

      <h2>Uygunluk</h2>
      <p>En az 18 yaşında ve bu koşulları kabul etmek için hukuken ehil olmalısınız. PapSee'yi başka bir kişi için yalnızca o kişinin verilerini ve tedavi bilgilerini yönetmeye hukuken yetkiliyseniz kullanabilirsiniz.</p>

      <h2>Hizmet</h2>
      <p>PapSee, uyumlu PAP cihazı dosyalarını içe aktarmanızı ve bunlardan hesaplanan grafikleri, olay indekslerini, ayarları ve istatistikleri görüntülemenizi sağlar. Cihaz desteği ve özellikler hizmet geliştikçe değişebilir. Beta olarak belirtilen özellikler eksik olabilir veya bildirim yapılmadan değişebilir.</p>
      <p>Ücretli bir plan açıkça sunulup kabul edilmedikçe erişim abonelik ücreti olmadan sağlanır. Bu koşullar PapSee'nin belirli bir özelliği sunmasını veya sürdürmesini zorunlu kılmaz.</p>

      <h2>Tıbbi tavsiye değildir</h2>
      <p>PapSee, PAP cihazı tarafından kaydedilen verileri görüntülemeye yarayan bir bilgilendirme aracıdır. Tıbbi cihaz, sağlık hizmeti sunucusu, tanı, reçete veya profesyonel tıbbi tavsiye yerine geçen bir hizmet değildir. Cihazın oluşturduğu olaylar ve PapSee hesaplamaları eksik veya hatalı olabilir. Yalnızca PapSee'de gösterilen bilgilere dayanarak tedaviye başlamayın, tedaviyi bırakmayın veya tedavi ayarlarını değiştirmeyin.</p>
      <p>Belirtiler, tedavi ayarları veya klinik kararlar için yetkin bir sağlık çalışanına danışın. Acil durumda hemen yerel acil yardım hizmetleriyle iletişime geçin. Acil yardım istemek için PapSee'yi kullanmayın.</p>

      <h2>Hesabınız</h2>
      <p>Doğru hesap bilgileri verin, giriş bilgilerinizi gizli tutun ve yetkisiz erişim şüphesini gecikmeden bildirin. Uygulanabilir hukuk aksini öngörmedikçe hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz. Başka bir kişinin sağlık verilerini açığa çıkaracak şekilde hesap paylaşmayın.</p>

      <h2>Verileriniz</h2>
      <p>Yüklediğiniz dosya ve bilgiler üzerindeki haklarınız size ait olmaya devam eder. PapSee'ye bu verileri yalnızca hizmeti sizin için işletmek, güvenliğini sağlamak ve iyileştirmek için gereken ölçüde barındırma, kopyalama, ayrıştırma, dönüştürme ve görüntüleme konusunda sınırlı ve münhasır olmayan bir hak verirsiniz.</p>
      <p>Verileri yükleme hakkına sahip olduğunuzu ve yüklemenin başka bir kişinin gizlilik, sır saklama veya fikrî mülkiyet haklarını ihlal etmediğini doğrularsınız. İhtiyaç duyduğunuz özgün cihaz dosyalarını veya diğer yedekleri saklamak sizin sorumluluğunuzdadır.</p>

      <h2>Kabul edilebilir kullanım</h2>
      <p>Şunları yapamazsınız:</p>
      <ul>
        <li>hukuki yetkiniz olmadan başka bir kişinin hesabına veya verilerine erişmek;</li>
        <li>kimlik doğrulama, güvenlik, hız sınırı veya hizmet altyapısını incelemek, aşmak ya da bozmak;</li>
        <li>zararlı kod, kasıtlı olarak bozulmuş içerik veya başka bir kişinin haklarını ihlal eden içerik yüklemek;</li>
        <li>hizmeti hukuka aykırı ya da hileli biçimde kullanmak veya PapSee'yi klinik tavsiye gibi göstererek başkaları adına tıbbi karar vermek; ya da</li>
        <li>emredici hukukun izin verdiği durumlar dışında hizmeti yeniden satmak, otomatik olarak toplamak veya sistematik biçimde çoğaltmak.</li>
      </ul>

      <h2>PapSee içerikleri</h2>
      <p>Hizmet, arayüz, marka unsurları ve yazılım uygulanabilir fikrî mülkiyet mevzuatıyla korunur. Bu koşullar yalnızca hizmeti kullanmanız için sınırlı bir hak verir. PapSee içeriklerinin mülkiyetini devretmez ve hukuken sınırlandırılamayan hakları sınırlandırmaz.</p>

      <h2>Üçüncü taraf hizmetleri</h2>
      <p>PapSee barındırma, veritabanı, kimlik doğrulama, kötüye kullanım önleme ve e-posta sağlayıcılarına bağlı olabilir. Bu sağlayıcıların kesintileri veya değişiklikleri hizmeti etkileyebilir. Üçüncü tarafla giriş yöntemini seçerseniz o sağlayıcının koşulları ve gizlilik uygulamaları kendi veri işlemesi için ayrıca geçerli olur.</p>

      <h2>Erişilebilirlik ve değişiklikler</h2>
      <p>PapSee'yi erişilebilir tutmayı hedefleriz, ancak kesintisiz veya hatasız çalışma garanti edilmez. Bakım, güvenlik olayları, sağlayıcı kesintileri veya mevzuat değişiklikleri hizmetin bir kısmını ya da tamamını durdurabilir. Menfaatlerinizi ve uygulanabilir tüketici hukukunu dikkate alarak makul ölçüde gerekli olduğunda özellik ekleyebilir, değiştirebilir veya kaldırabiliriz.</p>

      <h2>Askıya alma, sona erdirme ve silme</h2>
      <p>PapSee'yi kullanmayı bırakabilir ve hesabınızın silinmesini isteyebilirsiniz. Kullanıcıları veya sistemleri korumak, hukuka uymak, esaslı bir ihlali incelemek ya da kötüye kullanımı önlemek için makul ölçüde gerekli olduğunda erişimi sınırlandırabilir veya askıya alabiliriz. Uygulanabilir ve hukuka uygun olduğunda kalıcı sona erdirme öncesinde bildirimde bulunur ve sorunu giderme fırsatı veririz.</p>
      <p>Sona erme sonrasında hizmeti kullanma hakkınız biter. Veriler gizlilik politikası ve geçerli hukuki saklama yükümlülükleri kapsamında işlenir. Mülkiyet, sorumluluk, uyuşmazlıklar ve doğmuş haklar gibi niteliği gereği devam etmesi gereken hükümler yürürlükte kalır.</p>

      <h2>Garantiler</h2>
      <p>Kanunun izin verdiği ölçüde PapSee mevcut hâliyle sunulur ve hukuken hariç tutulamayanlar dışında garanti verilmez. Önemli sonuçları özgün cihaz verileriyle karşılaştırmak ve gerektiğinde profesyonel görüş almak sizin sorumluluğunuzdadır.</p>

      <h2>Sorumluluk</h2>
      <p>Kanunun izin verdiği ölçüde PapSee; cihazın oluşturduğu bilgilere güvenilmesi, erişim kaybı, üçüncü taraf hizmetleri veya içe aktarılan dosyaların kendi kopyanızı saklamamanız nedeniyle doğan dolaylı, arızi veya sonuç niteliğindeki kayıplardan sorumlu değildir. Bu koşullardaki hiçbir hüküm; hile, kasıt, ağır kusur, ölüm veya bedensel zarar dâhil olmak üzere hukuken hariç tutulamayacak sorumluluğu ortadan kaldırmaz ya da sınırlandırmaz.</p>
      <p>Emredici tüketici haklarınız etkilenmez. Her sınırlama yalnızca bulunduğunuz hukuk düzeninin izin verdiği en geniş ölçüde uygulanır.</p>

      <h2>Uygulanacak hukuk ve uyuşmazlıklar</h2>
      <p>Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Bu seçim, ikamet ettiğiniz ülke hukukunun size sağladığı emredici korumaları ortadan kaldırmaz. Zorunlu yetkiye sahip mahkemelere ve tüketici uyuşmazlık mercilerine başvuru haklarınız saklıdır.</p>
      <p>Resmî bir sürece başlamadan önce konunun incelenebilmesi için <a href="/tr/contact">iletişim sayfası</a> üzerinden bize ulaşabilirsiniz.</p>

      <h2>Koşullardaki değişiklikler</h2>
      <p>Hizmet, mevzuat veya güvenlikle ilgili değişiklikleri yansıtmak için bu koşulları güncelleyebiliriz. Geçerli sürüm ve yürürlük tarihi bu sayfada yer alır. Gerekli olduğunda önemli değişiklikleri makul süre önce bildiririz. Değişiklik uygulanabilir hukuk uyarınca yeniden kabul gerektiriyorsa yalnızca hizmeti kullanmaya devam etmeniz gerekli kabulün yerine geçmez.</p>

      <h2>İletişim</h2>
      <p>Sorularınızı, bildirimlerinizi ve hesap taleplerinizi <a href="/tr/contact">iletişim sayfası</a> üzerinden gönderebilirsiniz.</p>
    `,
  },
] satisfies ContractSeed[]
