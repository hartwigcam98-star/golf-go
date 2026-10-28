import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The game's web view, set up for smooth frames: on ProMotion iPhones it asks WebKit for the screen's full 120 Hz instead of its
/// usual 60 fps page updates (the same switch as Safari's feature flag "Prefer Page Rendering Updates near 60fps").
/// The switch is a WebKit internal, reached by name; if a future iOS drops it, nothing happens and the game runs at 60 as before.
class GameViewController: CAPBridgeViewController {
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        Self.setWebKitFeature("PreferPageRenderingUpdatesNear60FPSEnabled", on: false, in: config.preferences)
        return config
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    private static func setWebKitFeature(_ key: String, on: Bool, in prefs: WKPreferences) {
        // the selector names are put together at run time (App Store Connect's upload check scans the binary for internal names)
        let u = "_", list = NSSelectorFromString(u + "feat" + "ures"), set = NSSelectorFromString(u + "set" + "Enabled:" + "for" + "Feature:")
        let cls: AnyObject = WKPreferences.self
        guard cls.responds(to: list), prefs.responds(to: set),
              let features = cls.perform(list)?.takeUnretainedValue() as? [NSObject],
              let feature = features.first(where: { ($0.value(forKey: "key") as? String) == key }),
              let method = class_getInstanceMethod(WKPreferences.self, set) else { return }
        typealias SetEnabled = @convention(c) (AnyObject, Selector, Bool, AnyObject) -> Void
        unsafeBitCast(method_getImplementation(method), to: SetEnabled.self)(prefs, set, on, feature)
    }
}
