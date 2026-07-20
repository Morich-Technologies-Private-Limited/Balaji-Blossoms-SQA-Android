import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  fetchQuotationsByUnit,
  fetchQuotationsByUser,
} from "../../api/fetchQuotation";
import { getCurrentUser } from "../../utility/secureStorage";
import CreateQuotationModal from "./CreateQuotationModal";
import makeStyles from "./QuotationViewList.styles";

const LEVELS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "DELIVERY_SHADE", label: "Delivery shade" },
  { key: "INVOICE_GENERATED", label: "Invoiced" },
];

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Delivery shade", tint: "#0f4776" },
  INVOICE_GENERATED: { label: "Invoiced", tint: "#7CB342" },
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

/**
 * Quotation list.
 *
 * Both userId and unitId are read from the signed-in user in secure storage
 * (user.emailId / user.unitId) — nothing identity-related comes in as a prop.
 *
 * Props
 *  - mode      "user" (default) | "unit"  — which endpoint to read from
 *  - onSelect  (quotation) => void — fired when a card is tapped
 */
export default function QuotationViewList({ mode = "user", onSelect }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop }),
    [width, isTablet, isDesktop],
  );

  const [currentUser, setCurrentUser] = useState(null);
  const [userReady, setUserReady] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const resolvedUserId = currentUser?.emailId;
  const resolvedUnitId = currentUser?.unitId;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!alive) return;
        setCurrentUser(user);
      } finally {
        if (alive) setUserReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userReady) return;

    if (mode === "user" && !resolvedUserId) {
      setError("No signed-in user found.");
      setQuotations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "unit" && !resolvedUnitId) {
      setError("No unit assigned to this user.");
      setQuotations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);

    const response =
      mode === "unit"
        ? await fetchQuotationsByUnit(resolvedUnitId)
        : await fetchQuotationsByUser(resolvedUserId);

    if (response?.status === "SUCCESS") {
      setQuotations(response.payload || []);
    } else if (response?.status === "NOT_FOUND") {
      setQuotations([]);
    } else {
      setQuotations([]);
      setError(response?.message || "Could not load quotations.");
    }

    setLoading(false);
    setRefreshing(false);
  }, [mode, userReady, resolvedUserId, resolvedUnitId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations
      .filter((q) => (level === "ALL" ? true : q.level === level))
      .filter((q) => {
        if (!term) return true;
        return (
          String(q.quotationId).includes(term) ||
          (q.customerName || "").toLowerCase().includes(term) ||
          (q.assignedUserName || "").toLowerCase().includes(term) ||
          (q.assignedUserId || "").toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updateDate || b.creationDate || 0) -
          new Date(a.updateDate || a.creationDate || 0),
      );
  }, [quotations, search, level]);

  const handleCreated = (created) => {
    setCreateOpen(false);
    if (created) setQuotations((prev) => [created, ...prev]);
    else load();
  };

  const renderCard = ({ item }) => {
    const meta = LEVEL_META[item.level] || {
      label: item.level || "—",
      tint: "#94A3B8",
    };

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onSelect?.(item)}
      >
        <View style={[styles.cardStrip, { backgroundColor: meta.tint }]} />

        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName || "Unnamed customer"}
            </Text>
            <Text style={styles.quotationId}>QTN-{item.quotationId}</Text>
          </View>

          <View
            style={[styles.levelPill, { backgroundColor: `${meta.tint}1A` }]}
          >
            <Text style={[styles.levelPillText, { color: meta.tint }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="person-outline"
            size={styles.iconSizeSmall}
            color="#94A3B8"
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.assignedUserName || item.assignedUserId || "Unassigned"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name="calendar-outline"
            size={styles.iconSizeSmall}
            color="#94A3B8"
          />
          <Text style={styles.metaText}>
            Created {formatDate(item.creationDate)}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.sectionLabel}>Total</Text>
            <Text style={styles.amount}>{formatAmount(item.totalAmount)}</Text>
          </View>
          <View style={styles.countsRow}>
            <Text style={styles.countText}>
              {(item.plantList?.length || 0) +
                (item.specialPlantList?.length || 0)}{" "}
              items
            </Text>
            <Ionicons
              name="chevron-forward"
              size={styles.iconSize}
              color="#94A3B8"
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={styles.iconSize}
          color="#94A3B8"
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer, ID or sales person"
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={styles.iconSize}
              color="#94A3B8"
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {LEVELS.map((option) => {
          const active = option.key === level;
          return (
            <Pressable
              key={option.key}
              onPress={() => setLevel(option.key)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  active && styles.filterPillTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.resultCount}>
        {visible.length} of {quotations.length} shown
      </Text>
    </View>
  );

  const listEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name={error ? "cloud-offline-outline" : "document-text-outline"}
          size={40}
          color="#94A3B8"
        />
        <Text style={styles.emptyTitle}>
          {error ? "Couldn't load quotations" : "No quotations yet"}
        </Text>
        <Text style={styles.emptyText}>
          {error ||
            (quotations.length
              ? "Nothing matches this search or filter."
              : "Create the first quotation to get started.")}
        </Text>
        <Pressable
          style={styles.emptyAction}
          onPress={error ? load : () => setCreateOpen(true)}
        >
          <Text style={styles.emptyActionText}>
            {error ? "TRY AGAIN" : "NEW QUOTATION"}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0f4776" />
            <Text style={styles.loadingText}>Loading quotations…</Text>
          </View>
        ) : (
          <FlatList
            key={styles.numColumns}
            data={visible}
            keyExtractor={(item) => String(item.quotationId)}
            renderItem={renderCard}
            numColumns={styles.numColumns}
            columnWrapperStyle={styles.numColumns > 1 ? styles.column : null}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0f4776"
                colors={["#0f4776"]}
              />
            }
          />
        )}

        {!isDesktop ? (
          <Pressable style={styles.fab} onPress={() => setCreateOpen(true)}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <CreateQuotationModal
        visible={createOpen}
        userId={resolvedUserId}
        unitId={resolvedUnitId}
        userName={currentUser?.name || currentUser?.userName}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </View>
  );
}
