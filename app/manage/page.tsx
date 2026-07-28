import { requireChatGPTUser } from "../chatgpt-auth";
import { getPhotoEnvironment } from "../photo-storage";
import PhotoManager from "./photo-manager";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const user = await requireChatGPTUser("/manage");
  const adminEmail = getPhotoEnvironment().ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || user.email.toLowerCase() !== adminEmail) {
    return (
      <main className="manager-shell">
        <section className="manager-card manager-denied">
          <p className="kicker">AJ Shaw / photo manager</p>
          <h1>Private archive</h1>
          <p>This account does not have permission to edit the portfolio.</p>
          <a className="button button-primary" href="/">
            Return to portfolio
          </a>
        </section>
      </main>
    );
  }

  return <PhotoManager displayName={user.displayName} />;
}
