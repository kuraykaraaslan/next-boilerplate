export default abstract class BaseProvider {
  abstract sendShortMessage(to: string, body: string): Promise<void>;
}
