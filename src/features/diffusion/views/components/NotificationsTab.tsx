import { useState } from "react";
import { NotificationRead } from "../../models/types";
import { useDiffusion } from "../../viewmodels/useDiffusion";
import { NotificationDialog } from "./NotificationDialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NotificationsTabProps {
  vm: ReturnType<typeof useDiffusion>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const NotificationsTab = ({
  vm,
  canCreate,
  canUpdate,
  canDelete,
}: NotificationsTabProps) => {
  const {
    notifications,
    isLoadingNotifications: isLoading,
    openAddNotification: onOpenAdd,
    openEditNotification: onOpenEdit,
    changeNotificationStatus: onToggleStatus,
    removeNotification: onDelete,
    dialogNotificationOpen,
    setDialogNotificationOpen,
    editingNotification,
    notificationForm,
    setNotificationForm,
    transactionTypes,
    channels,
    saveNotification,
  } = vm;

  const [notifToDelete, setNotifToDelete] = useState<string | null>(null);
  const [notifToToggle, setNotifToToggle] = useState<{ notif: NotificationRead; nextActive: boolean } | null>(null);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Gestion des Notifications</h3>
          <p className="text-muted-foreground text-xs">
            Paramétrez les notifications automatiques déclenchées lors des transactions clients.
          </p>
        </div>
        {canCreate && (
          <Button onClick={onOpenAdd} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Notification
          </Button>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border/40">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="font-semibold">Libellé</TableHead>
              <TableHead className="font-semibold">Transaction</TableHead>
              <TableHead className="font-semibold">Canal</TableHead>
              <TableHead className="font-semibold">Contenus</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                  Chargement des notifications...
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                  Aucune notification configurée.
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notif) => (
                <TableRow key={notif.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-foreground text-xs">{notif.libelle}</TableCell>
                  <TableCell className="text-xs font-semibold capitalize">
                    {notif.type_transaction === "transfert_b2w" ? "Transfert B2W" : notif.type_transaction}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-muted/60 text-foreground border-border text-[11px]">
                      {notif.canal === "sms" ? "SMS" : notif.canal === "mail" ? "E-mail" : "In-App"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="space-y-1 text-xs">
                      <p className="truncate text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Envoyeur: </span>
                        {notif.contenu_envoyeur || "—"}
                      </p>
                      <p className="truncate text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Destinataire: </span>
                        {notif.contenu_destinataire || "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={notif.is_active}
                      disabled={!canUpdate}
                      onCheckedChange={(checked) => setNotifToToggle({ notif, nextActive: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenEdit(notif)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/80"
                          onClick={() => setNotifToDelete(notif.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={!!notifToDelete} onOpenChange={(open) => !open && setNotifToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (notifToDelete) {
                  onDelete(notifToDelete);
                  setNotifToDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Toggle Status */}
      <AlertDialog open={!!notifToToggle} onOpenChange={(open) => !open && setNotifToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {notifToToggle?.nextActive ? "Activer la notification" : "Désactiver la notification"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment {notifToToggle?.nextActive ? "activer" : "désactiver"} la notification "
              {notifToToggle?.notif.libelle}" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (notifToToggle) {
                  onToggleStatus(notifToToggle.notif, notifToToggle.nextActive);
                  setNotifToToggle(null);
                }
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Modal Dialog */}
      <NotificationDialog
        open={dialogNotificationOpen}
        onOpenChange={setDialogNotificationOpen}
        editingNotification={editingNotification}
        form={notificationForm}
        setForm={setNotificationForm}
        transactionTypes={transactionTypes}
        channels={channels}
        onSave={saveNotification}
        errors={vm.notificationErrors}
        clearError={vm.clearNotificationError}
        onValidate={vm.validateNotification}
      />
    </div>
  );
};

export default NotificationsTab;
