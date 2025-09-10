// AppIntents.swift
import AppIntents
import SwiftUI

struct ReportWildlifeIntent: AppIntent {
    static var title: LocalizedStringResource = "Report Wildlife Sighting"
    static var description = IntentDescription("Report a wildlife sighting to Oh No Deer")

    @Parameter(title: "Animal Type")
    var animalType: String

    @Parameter(title: "Quantity", default: 1)
    var quantity: Int

    static var parameterSummary: some ParameterSummary {
        Summary("Report \(\.$quantity) \(\.$animalType)")
    }

    func perform() async throws -> some IntentResult {
        // This will be called when the intent is executed
        // The actual implementation will be handled by the React Native bridge

        let userActivity = NSUserActivity(activityType: "com.buzz20.ohnodeer.report")
        userActivity.title = "Report Wildlife Sighting"
        userActivity.userInfo = [
            "animalType": animalType,
            "quantity": quantity
        ]

        return .result()
    }
}

struct OhNoDeerShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ReportWildlifeIntent(),
            phrases: [
                "Report a \(\.$animalType) sighting with Oh No Deer",
                "Tell Oh No Deer about \(\.$quantity) \(\.$animalType)",
                "Report wildlife to Oh No Deer"
            ],
            shortTitle: "Report Sighting",
            systemImageName: "eye.trianglebadge.exclamationmark"
        )
    }
}
